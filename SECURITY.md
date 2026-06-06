# Security Policy

## Reporting a vulnerability

If you find a security issue in this site, please report it privately:

- Email: **esoto.work@outlook.com**
- Please include steps to reproduce and avoid accessing or modifying data that
  isn't yours.

I aim to acknowledge reports within 72 hours.

## Scope

This is a static portfolio hosted on GitHub Pages at `www.cybersoto.com`.
There is no backend or database. The optional A.N.G.E.L assistant only works
when a server-side proxy is configured (no API keys are shipped to the browser).

## Hardening in place

- Content-Security-Policy (meta) restricting script/style/img/connect origins.
- No secrets in client-side code.
- `postMessage` listeners validate `event.origin`.
- Disclosure contact published at `/.well-known/security.txt`.

## Known limitations

GitHub Pages cannot set HTTP response headers, so header-only protections
(HSTS, `X-Frame-Options`, `X-Content-Type-Options`) are not enforced. For full
header control + a WAF, front the site with Cloudflare.
