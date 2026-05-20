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
const resultMdnf = document.getElementById("result-mdnf");

let currentN = 3;
let algorithmStep = 0;

function updateMdnfResult() {
  const expr = TruthTable.buildMdnf(tableBody);
  resultMdnf.textContent = expr === null ? "—" : expr;
}

function resetAlgorithm() {
  algorithmStep = 0;
  delete tableBody.dataset.locked;
  delete tableBody.dataset.step;
  workbench.classList.remove("workbench--locked");
  resultMdnf.textContent = "—";
}

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

  resetAlgorithm();
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
  resetAlgorithm();
  TruthTable.buildTruthTable(currentN, tableHead, tableBody);
});

btnNext.addEventListener("click", () => {
  if (algorithmStep === 0) {
    if (typeof TruthTable.lockFunctionColumn !== "function") {
      console.error("Обновите страницу (Ctrl+Shift+R): загружена старая версия скриптов.");
      return;
    }
    TruthTable.lockFunctionColumn(tableBody);
    algorithmStep = 1;
    workbench.classList.add("workbench--locked");
    return;
  }

  if (algorithmStep === 1) {
    if (typeof TruthTable.strikeAlgoColumns !== "function") {
      console.error("Обновите страницу (Ctrl+Shift+R): загружена старая версия скриптов.");
      return;
    }
    TruthTable.strikeAlgoColumns(tableBody);
    algorithmStep = 2;
    return;
  }

  if (algorithmStep === 2) {
    if (typeof TruthTable.strikeAlgoExceptMinimum !== "function") {
      console.error("Обновите страницу (Ctrl+Shift+R): загружена старая версия скриптов.");
      return;
    }
    TruthTable.strikeAlgoExceptMinimum(tableBody);
    algorithmStep = 3;
    updateMdnfResult();
    return;
  }

  if (algorithmStep >= 3) {
    updateMdnfResult();
  }
});
