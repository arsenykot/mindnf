const page = document.getElementById("page");
const landing = document.getElementById("landing");
const setup = document.getElementById("setup");
const workbench = document.getElementById("workbench");
const siteHeader = document.getElementById("site-header");
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

function hideAllViews() {
  page.classList.remove("page--setup", "page--workbench", "page--game-mode", "page--game");
  document.body.classList.remove("app-setup", "app-workbench", "app-game-mode", "app-game");
  landing.hidden = false;
  landing.setAttribute("aria-hidden", "false");
  hideSetupPanel();
  setup.setAttribute("aria-hidden", "true");
  hideWorkbenchPanel();
  workbench.setAttribute("aria-hidden", "true");
  siteHeader.classList.remove("site-header--on-dark");
  window.Game?.resetGameUi?.();
}

function hideLanding() {
  page.classList.add("page--hidden-landing");
  landing.setAttribute("aria-hidden", "true");
}

function showLanding() {
  hideAllViews();
  page.classList.remove("page--hidden-landing");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.AppUI = {
  hideLanding,
  showLanding,
  page,
};

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

function showSetupPanel() {
  setup.classList.add("is-visible");
  setup.hidden = false;
  setup.removeAttribute("hidden");
}

function hideSetupPanel() {
  setup.classList.remove("is-visible");
  setup.hidden = true;
  setup.setAttribute("hidden", "");
}

function showWorkbenchPanel() {
  workbench.classList.add("is-visible");
  workbench.hidden = false;
  workbench.removeAttribute("hidden");
}

function hideWorkbenchPanel() {
  workbench.classList.remove("is-visible");
  workbench.hidden = true;
  workbench.setAttribute("hidden", "");
}

function openSetup() {
  hideLanding();
  hideAllViews();
  landing.hidden = true;
  document.body.classList.add("app-setup");
  page.classList.add("page--setup");
  showSetupPanel();
  setup.setAttribute("aria-hidden", "false");
  varCountInput.focus();
}

function openWorkbench(n) {
  currentN = TruthTable.clampN(n);
  varCountInput.value = String(currentN);
  workbenchNInput.value = String(currentN);
  titleN.textContent = `N=${currentN}`;

  showSetupError("");
  hideLanding();
  hideAllViews();
  landing.hidden = true;
  document.body.classList.add("app-workbench");
  page.classList.add("page--workbench");
  showWorkbenchPanel();
  workbench.setAttribute("aria-hidden", "false");

  resetAlgorithm();
  TruthTable.buildTruthTable(currentN, tableHead, tableBody);
}

btnStartLanding.addEventListener("click", openSetup);

document.getElementById("btn-play-landing")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (window.Game?.openGameModeSelect) {
    window.Game.openGameModeSelect();
  }
});

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
    TruthTable.lockFunctionColumn(tableBody);
    algorithmStep = 1;
    workbench.classList.add("workbench--locked");
    return;
  }

  if (algorithmStep === 1) {
    TruthTable.strikeAlgoColumns(tableBody);
    algorithmStep = 2;
    return;
  }

  if (algorithmStep === 2) {
    TruthTable.strikeAlgoByMinLength(tableBody, currentN);
    algorithmStep = 3;
    return;
  }

  if (algorithmStep === 3) {
    TruthTable.strikeAlgoFinalStep(tableBody, currentN);
    algorithmStep = 4;
    updateMdnfResult();
    return;
  }

  if (algorithmStep >= 4) {
    updateMdnfResult();
  }
});
