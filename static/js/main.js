const page = document.getElementById("page");
const landing = document.getElementById("landing");
const setup = document.getElementById("setup");
const workbench = document.getElementById("workbench");
const btnStartLanding = document.getElementById("btn-start-landing");
const btnStartSetup = document.getElementById("btn-start-setup");
const varCountInput = document.getElementById("var-count");
const setupError = document.getElementById("setup-error");
const titleN = document.getElementById("title-n");
const workbenchNInput = document.getElementById("workbench-n");
const tableHead = document.getElementById("truth-table-head");
const tableBody = document.getElementById("truth-table-body");
const btnNext = document.getElementById("btn-next");

let currentN = 3;

function showSetupError(message) {
  setupError.textContent = message;
  setupError.hidden = !message;
}

function openSetup() {
  page.classList.add("page--setup");
  setup.setAttribute("aria-hidden", "false");
  landing.setAttribute("aria-hidden", "true");
  varCountInput.focus();
}

function openWorkbench(n) {
  currentN = TruthTable.clampN(n);
  varCountInput.value = String(currentN);
  workbenchNInput.value = String(currentN);
  titleN.textContent = `N=${currentN}`;

  showSetupError("");
  page.classList.remove("page--setup");
  page.classList.add("page--workbench");
  setup.setAttribute("aria-hidden", "true");
  workbench.setAttribute("aria-hidden", "false");
  landing.setAttribute("aria-hidden", "true");

  TruthTable.buildTruthTable(currentN, tableHead, tableBody);
}

btnStartLanding.addEventListener("click", openSetup);

btnStartSetup.addEventListener("click", () => {
  const raw = varCountInput.value.trim();
  const n = Number(raw);

  if (!raw || !Number.isInteger(n)) {
    showSetupError("Введите целое число от 1 до 8.");
    return;
  }

  if (n < 1 || n > 8) {
    showSetupError("N должно быть от 1 до 8.");
    return;
  }

  openWorkbench(n);
});

workbenchNInput.addEventListener("change", () => {
  const n = TruthTable.clampN(workbenchNInput.value);
  workbenchNInput.value = String(n);
  currentN = n;
  titleN.textContent = `N=${n}`;
  varCountInput.value = String(n);
  TruthTable.buildTruthTable(currentN, tableHead, tableBody);
});

btnNext.addEventListener("click", () => {
  // следующий шаг алгоритма — позже
});
