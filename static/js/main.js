const page = document.getElementById("page");
const landing = document.getElementById("landing");
const setup = document.getElementById("setup");
const btnStartLanding = document.getElementById("btn-start-landing");
const btnStartSetup = document.getElementById("btn-start-setup");
const varCountInput = document.getElementById("var-count");

btnStartLanding.addEventListener("click", () => {
  page.classList.add("page--setup");
  setup.setAttribute("aria-hidden", "false");
  landing.setAttribute("aria-hidden", "true");
  varCountInput.focus();
});

btnStartSetup.addEventListener("click", () => {
  // следующий шаг — позже
});
