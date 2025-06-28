const menIcon = document.querySelector('#menu-icon');
const navbar = document.querySelector('.navbar');

menIcon.onclick = () => {
    menIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
}

.reactive-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 0, 0.5), rgba(0, 255, 0, 0));
  animation: react 1s infinite;
}
@keyframes react {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}
.fade-in {
  animation: fadeIn 1s ease-in-out;
}
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
