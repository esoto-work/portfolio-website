#!/usr/bin/env node
/*
 * Integrity manifest for the static site (the first-party analog to "secure boot":
 * a verified, tamper-evident record of exactly which files you shipped).
 *
 *   node scripts/generate-integrity.js          # write integrity-manifest.json
 *   node scripts/generate-integrity.js --check   # compare; exit 1 on any drift
 *
 * Run --check in CI (or locally) after a build to detect unexpected changes/
 * additions/deletions to the deployed files.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "integrity-manifest.json");

// Not served to visitors / would be circular — skip these.
const IGNORE_DIRS = new Set([".git", "node_modules", ".github", "scripts"]);
const IGNORE_FILES = new Set(["integrity-manifest.json", ".DS_Store", "Thumbs.db"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      if (IGNORE_FILES.has(entry.name)) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function hashFile(file) {
  return "sha256-" +
    crypto.createHash("sha256").update(fs.readFileSync(file)).digest("base64");
}

function buildManifest() {
  const files = walk(ROOT).sort();
  const manifest = {};
  for (const f of files) {
    manifest[path.relative(ROOT, f).split(path.sep).join("/")] = hashFile(f);
  }
  return manifest;
}

const check = process.argv.includes("--check");
const current = buildManifest();

if (!check) {
  fs.writeFileSync(MANIFEST, JSON.stringify(current, null, 2) + "\n");
  console.log(`Wrote ${Object.keys(current).length} file hashes to integrity-manifest.json`);
  process.exit(0);
}

// --check mode
if (!fs.existsSync(MANIFEST)) {
  console.error("No integrity-manifest.json found. Run without --check first.");
  process.exit(1);
}
const saved = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const problems = [];
for (const [file, hash] of Object.entries(current)) {
  if (!(file in saved)) problems.push(`ADDED:    ${file}`);
  else if (saved[file] !== hash) problems.push(`CHANGED:  ${file}`);
}
for (const file of Object.keys(saved)) {
  if (!(file in current)) problems.push(`REMOVED:  ${file}`);
}

if (problems.length) {
  console.error("Integrity drift detected:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("Integrity OK: all files match the manifest.");
