const GAME_N = 3;

const gamePage = document.getElementById("page");
const gameLanding = document.getElementById("landing");
const gameScreen = document.getElementById("game-screen");
const gameMode = document.getElementById("game-mode");
const gameChallengePanel = document.getElementById("game-challenge");
const gameChallengeBanner = document.getElementById("game-challenge-banner");
const gameInstruction = document.getElementById("game-instruction");
const gameResultChallenge = document.getElementById("game-result-challenge");
const gameResultVs = document.getElementById("game-result-vs");
const gameChallengeUrlInput = document.getElementById("game-challenge-url");
const gameTableHead = document.getElementById("game-table-head");
const gameTableBody = document.getElementById("game-table-body");
const gameTableWrap = document.getElementById("game-table-wrap");
const gameTimerEl = document.getElementById("game-timer");
const gameStepEl = document.getElementById("game-step-label");
const gameHintEl = document.getElementById("game-hint");
const gameResultModal = document.getElementById("game-result");
const gameResultMdnf = document.getElementById("game-result-mdnf");
const gameResultTime = document.getElementById("game-result-time");
const gameResultBest = document.getElementById("game-result-best");
const toastEl = document.getElementById("site-toast");
const flashLeft = document.getElementById("game-flash-left");
const flashRight = document.getElementById("game-flash-right");

const STEP_HINTS = [
  "Шаг 1: зачеркните все строки, где f = 0 (номер строки, f или любая ячейка в строке).",
  "Шаг 2: в каждом столбце после f зачеркните значения из исключённых строк.",
  "Шаг 3: в каждой оставшейся строке оставьте только минимум — зачеркните остальное.",
];

let solution = null;
let fValues = [];
let gameStep = 0;
let gameStarted = false;
let timerStart = 0;
let timerId = null;
let markedStep1 = new Set();
let markedStep2 = new Set();
let markedStep3 = new Set();
let hintColsDone = new Set();
let hintRowsDone = new Set();
/** @type {"solo" | "challenge-host" | "challenge-guest"} */
let playMode = "solo";
let challengeHostTimeMs = null;
let challengeHostNick = "";

function hostDisplayName() {
  return challengeHostNick || "Игрок";
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 3200);
}

function flash(kind) {
  const nodes = [flashLeft, flashRight];
  nodes.forEach((el) => {
    el.classList.remove("game-flash--red", "game-flash--green");
    el.classList.add(kind === "ok" ? "game-flash--green" : "game-flash--red");
  });
  GameStore.recordFlash();
  window.setTimeout(() => {
    nodes.forEach((el) => {
      el.classList.remove("game-flash--red", "game-flash--green");
    });
  }, 420);
}

function updateHud() {
  gameStepEl.textContent = gameStarted ? `Шаг ${gameStep + 1} из 3` : "Инструкция";
  gameHintEl.textContent = gameStarted ? STEP_HINTS[gameStep] : "";
}

function startTimer() {
  timerStart = Date.now();
  gameTimerEl.textContent = "00:00.0";
  timerId = window.setInterval(() => {
    gameTimerEl.textContent = GameStore.formatTime(Date.now() - timerStart);
  }, 100);
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
  return Date.now() - timerStart;
}

function showOverlay(el) {
  if (!el) {
    return;
  }
  el.classList.add("is-visible");
  el.hidden = false;
  el.removeAttribute("hidden");
}

function hideOverlay(el) {
  if (!el) {
    return;
  }
  el.classList.remove("is-visible");
  el.hidden = true;
  el.setAttribute("hidden", "");
}

function hideResultModal() {
  hideOverlay(gameResultModal);
  if (gameResultChallenge) {
    gameResultChallenge.hidden = true;
  }
  if (gameResultVs) {
    gameResultVs.hidden = true;
  }
}

function updateChallengeBanner() {
  if (!gameChallengeBanner) {
    return;
  }
  if (playMode === "challenge-guest" && challengeHostTimeMs != null) {
    gameChallengeBanner.hidden = false;
    gameChallengeBanner.textContent = `Вызов от ${hostDisplayName()}: побить ${GameStore.formatTime(challengeHostTimeMs)}`;
    return;
  }
  if (playMode === "challenge-guest") {
    gameChallengeBanner.hidden = false;
    gameChallengeBanner.textContent = `Вызов от ${hostDisplayName()}`;
    return;
  }
  if (playMode === "challenge-host") {
    gameChallengeBanner.hidden = false;
    gameChallengeBanner.textContent = "Вызов: после победы скопируйте ссылку для друга";
    return;
  }
  gameChallengeBanner.hidden = true;
  gameChallengeBanner.textContent = "";
}

function showResultModal() {
  showOverlay(gameResultModal);
}

function getRowIndex(tr) {
  const num = tr.querySelector(".truth-table__num");
  return Number(num?.textContent) - 1;
}

function isZeroRow(row) {
  return solution.zeroRows.has(row);
}

function clearGameMarks() {
  markedStep1 = new Set();
  markedStep2 = new Set();
  markedStep3 = new Set();
  hintColsDone = new Set();
  hintRowsDone = new Set();
  gameTableBody.querySelectorAll(".game-mark").forEach((el) => {
    el.classList.remove("game-mark");
  });
  gameTableBody.querySelectorAll(".game-row-marked").forEach((tr) => {
    tr.classList.remove("game-row-marked");
  });
  gameTableHead.querySelectorAll(".game-hint-blink").forEach((el) => {
    el.classList.remove("game-hint-blink");
  });
  gameTableBody.querySelectorAll(".game-hint-blink").forEach((el) => {
    el.classList.remove("game-hint-blink");
  });
}

function getAlgoHeader(colIdx) {
  return gameTableHead.querySelector(`th[data-algo-col="${colIdx}"]`);
}

function getRowNumCell(row) {
  return getRowTr(row)?.querySelector(".truth-table__num");
}

function pulseHint(el) {
  if (!el) {
    return;
  }
  el.classList.remove("game-hint-blink");
  void el.offsetWidth;
  el.classList.add("game-hint-blink");
  const onEnd = () => {
    el.classList.remove("game-hint-blink");
    el.removeEventListener("animationend", onEnd);
  };
  el.addEventListener("animationend", onEnd);
}

function step2KeysForColumn(colIdx) {
  return [...solution.step2Keys].filter((key) => Number(key.split(":")[1]) === colIdx);
}

function step3KeysForRow(row) {
  return [...solution.step3Keys].filter((key) => Number(key.split(":")[0]) === row);
}

function isColumnStep2Complete(colIdx) {
  const keys = step2KeysForColumn(colIdx);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => markedStep2.has(key));
}

function isRowStep3Complete(row) {
  const keys = step3KeysForRow(row);
  if (keys.length === 0) {
    return false;
  }
  return keys.every((key) => markedStep3.has(key));
}

function checkStep2ColumnHints() {
  const colCount = gameTableHead.querySelectorAll("th[data-algo-col]").length;
  for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
    if (hintColsDone.has(colIdx) || !isColumnStep2Complete(colIdx)) {
      continue;
    }
    hintColsDone.add(colIdx);
    pulseHint(getAlgoHeader(colIdx));
  }
}

function checkStep3RowHints() {
  const rows = gameTableBody.querySelectorAll("tr").length;
  for (let row = 0; row < rows; row += 1) {
    if (hintRowsDone.has(row) || !isRowStep3Complete(row)) {
      continue;
    }
    hintRowsDone.add(row);
    pulseHint(getRowNumCell(row));
  }
}

function markRowStep1(tr, row) {
  if (markedStep1.has(row)) {
    return;
  }
  markedStep1.add(row);
  tr.classList.add("game-row-marked");
  tr.querySelectorAll("td").forEach((td) => {
    if (!td.classList.contains("truth-table__bit--before")) {
      td.classList.add("game-mark");
    }
  });
}

function getRowTr(row) {
  return gameTableBody.querySelectorAll("tr")[row];
}

function isAlgoCellMarked(row, colIdx) {
  const cell = TruthTable.getAlgoCell(getRowTr(row), colIdx);
  return Boolean(cell?.classList.contains("game-mark"));
}

function ensureCellMarked(cell, set, key) {
  if (!set.has(key)) {
    set.add(key);
  }
  cell.classList.add("game-mark");
}

function step1Done() {
  if (solution.step1Rows.length === 0) {
    return true;
  }
  return solution.step1Rows.every((row) => {
    const tr = getRowTr(row);
    return tr?.classList.contains("game-row-marked") || markedStep1.has(row);
  });
}

function step2Done() {
  if (solution.step2Keys.size === 0) {
    return true;
  }
  return [...solution.step2Keys].every((key) => {
    const [row, colIdx] = key.split(":").map(Number);
    return isAlgoCellMarked(row, colIdx);
  });
}

function step3Done() {
  if (solution.step3Keys.size === 0) {
    return true;
  }
  return [...solution.step3Keys].every((key) => {
    const [row, colIdx] = key.split(":").map(Number);
    return isAlgoCellMarked(row, colIdx);
  });
}

function isCurrentStepDone() {
  if (gameStep === 0) {
    return step1Done();
  }
  if (gameStep === 1) {
    return step2Done();
  }
  if (gameStep === 2) {
    return step3Done();
  }
  return false;
}

function formatResultMdnf() {
  if (solution.zeroRows.size === fValues.length) {
    return "0";
  }
  if (solution.zeroRows.size === 0) {
    return "1";
  }
  if (solution.mdnf && solution.mdnf !== "—") {
    return solution.mdnf;
  }
  return "0";
}

function advanceStep() {
  flash("ok");
  gameStep += 1;

  while (gameStep < 3 && isCurrentStepDone()) {
    gameStep += 1;
  }

  updateHud();

  if (gameStep >= 3) {
    finishGame();
  }
}

function tryAutoAdvance() {
  while (gameStarted && gameStep < 3 && isCurrentStepDone()) {
    gameStep += 1;
  }
  updateHud();
  if (gameStep >= 3) {
    finishGame();
  }
}

function finishGame() {
  if (!gameStarted) {
    return;
  }
  gameStarted = false;
  const elapsed = stopTimer();
  const stats = GameStore.recordWin(elapsed, formatResultMdnf());
  gameResultMdnf.textContent = formatResultMdnf();
  gameResultTime.textContent = GameStore.formatTime(elapsed);
  gameResultBest.textContent =
    stats.bestTimeMs === null ? "—" : GameStore.formatTime(stats.bestTimeMs);

  if (gameResultChallenge) {
    gameResultChallenge.hidden = true;
  }
  if (gameResultVs) {
    gameResultVs.hidden = true;
  }

  if (playMode === "challenge-host" && gameChallengeUrlInput) {
    gameChallengeUrlInput.value = GameChallenge.buildUrl(fValues, elapsed, challengeHostNick);
    if (gameResultChallenge) {
      gameResultChallenge.hidden = false;
    }
  } else if (playMode === "challenge-guest" && gameResultVs && challengeHostTimeMs != null) {
    gameResultVs.hidden = false;
    const hostLabel = GameStore.formatTime(challengeHostTimeMs);
    const youLabel = GameStore.formatTime(elapsed);
    if (elapsed < challengeHostTimeMs) {
      const delta = GameStore.formatTime(challengeHostTimeMs - elapsed);
      gameResultVs.textContent = `${hostDisplayName()}: ${hostLabel} · Вы: ${youLabel} — вы быстрее на ${delta}!`;
      gameResultVs.classList.remove("game-result__vs--lose");
      gameResultVs.classList.add("game-result__vs--win");
    } else if (elapsed > challengeHostTimeMs) {
      const delta = GameStore.formatTime(elapsed - challengeHostTimeMs);
      gameResultVs.textContent = `${hostDisplayName()}: ${hostLabel} · Вы: ${youLabel} — ${hostDisplayName()} быстрее на ${delta}.`;
      gameResultVs.classList.remove("game-result__vs--win");
      gameResultVs.classList.add("game-result__vs--lose");
    } else {
      gameResultVs.textContent = `${hostDisplayName()}: ${hostLabel} · Вы: ${youLabel} — ничья!`;
      gameResultVs.classList.remove("game-result__vs--win", "game-result__vs--lose");
    }
  } else if (playMode === "challenge-guest" && gameResultVs) {
    gameResultVs.hidden = false;
    gameResultVs.textContent = `Вызов от ${hostDisplayName()} — в ссылке нет времени, сравните результат вручную.`;
    gameResultVs.classList.remove("game-result__vs--win", "game-result__vs--lose");
  }

  showResultModal();
}

function handleStep1Click(tr, row) {
  if (!isZeroRow(row)) {
    flash("err");
    return;
  }
  if (markedStep1.has(row)) {
    return;
  }
  markRowStep1(tr, row);
  if (step1Done()) {
    advanceStep();
  }
}

function handleStep2Click(cell, row, colIdx) {
  if (step2Done()) {
    advanceStep();
    return;
  }
  const key = TruthTable.cellKey(row, colIdx);
  if (!solution.step2Keys.has(key)) {
    flash("err");
    return;
  }
  ensureCellMarked(cell, markedStep2, key);
  checkStep2ColumnHints();
  if (step2Done()) {
    advanceStep();
  }
}

function handleStep3Click(cell, row, colIdx) {
  if (step3Done()) {
    advanceStep();
    return;
  }
  const key = TruthTable.cellKey(row, colIdx);
  if (!solution.step3Keys.has(key)) {
    flash("err");
    return;
  }
  ensureCellMarked(cell, markedStep3, key);
  checkStep3RowHints();
  if (step3Done()) {
    advanceStep();
  }
}

function onGameCellClick(e) {
  if (!gameStarted) {
    return;
  }
  const td = e.target.closest("td");
  if (!td || !gameTableBody.contains(td)) {
    return;
  }
  const tr = td.closest("tr");
  const row = getRowIndex(tr);

  if (td.classList.contains("truth-table__bit--before")) {
    flash("err");
    return;
  }

  if (gameStep === 0) {
    handleStep1Click(tr, row);
    return;
  }

  const algoCell = td.classList.contains("truth-table__algo-col")
    ? td
    : td.closest(".truth-table__algo-col");

  if (algoCell) {
    const colIdx = Number(algoCell.dataset.algoCol);
    if (gameStep === 1) {
      handleStep2Click(algoCell, row, colIdx);
    } else if (gameStep === 2) {
      handleStep3Click(algoCell, row, colIdx);
    }
    return;
  }

  flash("err");
}

function bindGameTable() {
  gameTableBody.removeEventListener("click", onGameCellClick);
  gameTableBody.addEventListener("click", onGameCellClick);
}

function buildGameTable(presetFValues = null) {
  const rows = 2 ** GAME_N;
  fValues = presetFValues ?? TruthTable.randomFValues(rows);
  solution = TruthTable.computeGameSolution(GAME_N, fValues);
  TruthTable.buildTruthTable(GAME_N, gameTableHead, gameTableBody, {
    fValues,
    lockF: true,
  });
  bindGameTable();
}

function resetGameUi() {
  hideResultModal();
  hideOverlay(gameMode);
  hideOverlay(gameChallengePanel);
  hideOverlay(gameScreen);
  playMode = "solo";
  challengeHostTimeMs = null;
  challengeHostNick = "";
  updateChallengeBanner();
  if (gameMode) {
    gameMode.setAttribute("aria-hidden", "true");
  }
  if (gameScreen) {
    gameScreen.setAttribute("aria-hidden", "true");
  }
  if (gameInstruction) {
    gameInstruction.hidden = true;
  }
  if (gameTableWrap) {
    gameTableWrap.classList.remove("game-table-wrap--dimmed");
  }
  document.body.classList.remove("app-game-mode", "app-game");
  gamePage?.classList.remove("page--game-mode", "page--game");
}

function openGameModeSelect() {
  if (!gameMode) {
    console.error("game-mode panel not found");
    return;
  }
  resetGameUi();
  window.AppUI?.hideLanding();
  if (gameLanding) {
    gameLanding.hidden = true;
  }
  document.body.classList.add("app-game-mode");
  gamePage?.classList.add("page--game-mode");
  showOverlay(gameMode);
  gameMode.setAttribute("aria-hidden", "false");
}

function closeGameModeSelect() {
  hideOverlay(gameMode);
  if (gameMode) {
    gameMode.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("app-game-mode");
  gamePage?.classList.remove("page--game-mode");
}

function openGameInstruction(options = {}) {
  const {
    fValues: presetF = null,
    mode = "solo",
    hostTimeMs = null,
    hostNick = "",
  } = options;

  closeGameModeSelect();
  hideOverlay(gameChallengePanel);
  hideResultModal();
  if (gameLanding) {
    gameLanding.hidden = true;
  }

  playMode = mode;
  challengeHostTimeMs = hostTimeMs;
  challengeHostNick = hostNick;
  buildGameTable(presetF);
  gameStep = 0;
  gameStarted = false;
  clearGameMarks();
  document.body.classList.add("app-game");
  gamePage?.classList.add("page--game");
  showOverlay(gameScreen);
  gameScreen.setAttribute("aria-hidden", "false");
  if (gameInstruction) {
    gameInstruction.hidden = false;
  }
  if (gameTableWrap) {
    gameTableWrap.classList.add("game-table-wrap--dimmed");
  }
  gameTimerEl.textContent = "00:00.0";
  updateHud();
  updateChallengeBanner();
}

function openSoloInstruction() {
  openGameInstruction({ mode: "solo" });
}

function openChallengeSelect() {
  closeGameModeSelect();
  showOverlay(gameChallengePanel);
  if (gameChallengePanel) {
    gameChallengePanel.setAttribute("aria-hidden", "false");
  }
}

function startChallengeHost() {
  const presetF = GameChallenge.randomFValues();
  const hostNick = GameChallenge.loadHostNick() || "Игрок";
  openGameInstruction({ fValues: presetF, mode: "challenge-host", hostNick });
}

function openChallengeGuest(challenge) {
  window.AppUI?.hideLanding();
  if (gameLanding) {
    gameLanding.hidden = true;
  }
  openGameInstruction({
    fValues: challenge.fValues,
    mode: "challenge-guest",
    hostTimeMs: challenge.hostTimeMs,
    hostNick: challenge.hostNick,
  });
}

function tryOpenChallengeFromUrl() {
  const challenge = GameChallenge.parseFromUrl();
  if (!challenge) {
    const params = new URLSearchParams(window.location.search);
    if (params.has("challenge")) {
      showToast("Ссылка на вызов недействительна");
      GameChallenge.clearUrlParams();
    }
    return false;
  }
  openChallengeGuest(challenge);
  return true;
}

function startSoloGame() {
  gameInstruction.hidden = true;
  gameTableWrap.classList.remove("game-table-wrap--dimmed");
  gameStarted = true;
  gameStep = 0;
  clearGameMarks();
  updateHud();
  startTimer();
  tryAutoAdvance();
}

function closeGame() {
  stopTimer();
  gameStarted = false;
  GameChallenge.clearUrlParams();
  resetGameUi();
  window.AppUI.showLanding();
}

document.getElementById("btn-game-solo")?.addEventListener("click", openSoloInstruction);

document.getElementById("btn-game-friend")?.addEventListener("click", openChallengeSelect);

document.getElementById("btn-challenge-create")?.addEventListener("click", startChallengeHost);

document.getElementById("btn-challenge-back")?.addEventListener("click", () => {
  hideOverlay(gameChallengePanel);
  openGameModeSelect();
});

document.getElementById("btn-copy-challenge")?.addEventListener("click", async () => {
  const url = gameChallengeUrlInput?.value;
  if (!url) {
    return;
  }
  try {
    await GameChallenge.copyText(url);
    showToast("Ссылка скопирована");
  } catch {
    showToast("Не удалось скопировать — выделите ссылку вручную");
  }
});

document.getElementById("btn-game-instruction-start")?.addEventListener("click", startSoloGame);

document.getElementById("btn-game-mode-back")?.addEventListener("click", () => {
  closeGameModeSelect();
  window.AppUI.showLanding();
});

document.getElementById("btn-game-play-again")?.addEventListener("click", () => {
  hideResultModal();
  if (playMode === "challenge-host") {
    startChallengeHost();
  } else if (playMode === "challenge-guest") {
    openGameInstruction({
      fValues: fValues.slice(),
      mode: "challenge-guest",
      hostTimeMs: challengeHostTimeMs,
      hostNick: challengeHostNick,
    });
  } else {
    openSoloInstruction();
  }
});

document.getElementById("btn-game-main-menu")?.addEventListener("click", () => {
  hideResultModal();
  closeGame();
});

function initGame() {
  hideResultModal();
  const playBtn = document.getElementById("btn-play-landing");
  if (playBtn) {
    playBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openGameModeSelect();
    });
  }
  tryOpenChallengeFromUrl();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame);
} else {
  initGame();
}

window.Game = {
  openGameModeSelect,
  closeGame,
  resetGameUi,
  showToast,
};
