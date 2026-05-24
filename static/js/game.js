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
const gameStepBurst = document.getElementById("game-step-burst");
const gameStepBurstTitle = document.getElementById("game-step-burst-title");
const gameStepBurstHint = document.getElementById("game-step-burst-hint");
const gameWinBurst = document.getElementById("game-win-burst");

const STEP_BURST_POP_MS = 520;
const STEP_BURST_FADE_MS = 340;
const WIN_BURST_POP_MS = 650;
const WIN_BURST_HOLD_MS = 350;
const WIN_BURST_FADE_MS = 380;

let stepBurstChain = Promise.resolve();
/** @type {number[]} */
let rowMarkTimeouts = [];

const ROW_MARK_STAGGER_MS = 58;

const STEP_BURST_TASKS = [
  "Зачеркните все строки, где f = 0 (номер строки, f или любая ячейка в строке).",
  "В каждом столбце после f зачеркните значения из исключённых строк.",
  "В каждой строке зачеркните ячейки с бо́льшим числом цифр, чем у ячейки с наименьшим их числом.",
  "Зачеркните ячейки, не вошедшие в минимальный ответ (ошибки не учитываются).",
];

const STEP_HINTS = STEP_BURST_TASKS.map((text, i) => `Шаг ${i + 1}: ${text}`);

let solution = null;
let fValues = [];
let gameStep = 0;
let gameStarted = false;
let timerStart = 0;
let timerId = null;
let markedStep1 = new Set();
let markedStep2 = new Set();
let markedStep3 = new Set();
let markedStep4 = new Set();
let hintColsDone = new Set();
let hintRowsDone = new Set();
/** @type {HTMLTableCellElement[]} */
let algoHeaderCells = [];
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
  if (kind !== "err") {
    return;
  }
  const nodes = [flashLeft, flashRight];
  nodes.forEach((el) => {
    el.classList.remove("game-flash--red");
    el.classList.add("game-flash--red");
  });
  GameStore.recordFlash();
  window.setTimeout(() => {
    nodes.forEach((el) => {
      el.classList.remove("game-flash--red");
    });
  }, 420);
}

function restartFxChildAnimation(el) {
  const child = el?.querySelector(".game-step-burst__panel, .game-win-burst__mark");
  if (!child) {
    return;
  }
  child.style.animation = "none";
  void child.offsetWidth;
  child.style.animation = "";
}

function runGameFx(el, popMs, holdMs, fadeMs) {
  return new Promise((resolve) => {
    if (!el) {
      resolve();
      return;
    }
    restartFxChildAnimation(el);
    el.classList.remove("is-leaving", "is-active");
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("is-active");
      });
    });
    window.setTimeout(() => {
      el.classList.add("is-leaving");
      el.classList.remove("is-active");
      window.setTimeout(() => {
        el.classList.remove("is-leaving");
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        resolve();
      }, fadeMs);
    }, popMs + holdMs);
  });
}

function runStepBurstFx() {
  return new Promise((resolve) => {
    const el = gameStepBurst;
    if (!el) {
      resolve();
      return;
    }
    restartFxChildAnimation(el);
    el.classList.remove("is-leaving", "is-active", "is-interactive");
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");

    let dismissed = false;
    const finish = () => {
      if (dismissed) {
        return;
      }
      dismissed = true;
      el.classList.remove("is-interactive");
      el.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onKey);
      el.classList.add("is-leaving");
      el.classList.remove("is-active");
      window.setTimeout(() => {
        el.classList.remove("is-leaving");
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        resolve();
      }, STEP_BURST_FADE_MS);
    };

    const onInteract = () => finish();
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("is-active");
        window.setTimeout(() => {
          el.classList.add("is-interactive");
          el.addEventListener("click", onInteract);
          window.addEventListener("keydown", onKey);
        }, STEP_BURST_POP_MS);
      });
    });
  });
}

function playStepBurst(displayStep) {
  const idx = displayStep - 1;
  if (!gameStepBurst || !gameStepBurstTitle || !gameStepBurstHint || idx < 0 || idx >= STEP_BURST_TASKS.length) {
    return Promise.resolve();
  }
  gameStepBurstTitle.textContent = `${displayStep} ШАГ`;
  gameStepBurstHint.textContent = STEP_BURST_TASKS[idx];
  stepBurstChain = stepBurstChain.then(() => runStepBurstFx());
  return stepBurstChain;
}

function playWinBurst() {
  if (!gameWinBurst) {
    return Promise.resolve();
  }
  return runGameFx(gameWinBurst, WIN_BURST_POP_MS, WIN_BURST_HOLD_MS, WIN_BURST_FADE_MS);
}

function updateHud() {
  const total = solution?.hasStep4 ? 4 : 3;
  gameStepEl.textContent = gameStarted ? `Шаг ${gameStep + 1} из ${total}` : "Инструкция";
  gameHintEl.textContent = gameStarted ? (STEP_HINTS[gameStep] ?? "") : "";
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
  rowMarkTimeouts.forEach((id) => window.clearTimeout(id));
  rowMarkTimeouts = [];
  markedStep1 = new Set();
  markedStep2 = new Set();
  markedStep3 = new Set();
  markedStep4 = new Set();
  hintColsDone = new Set();
  hintRowsDone = new Set();
  gameTableBody.querySelectorAll(".game-mark").forEach((el) => {
    el.classList.remove("game-mark", "game-mark-pop");
  });
  gameTableBody.querySelectorAll(".game-row-marked").forEach((tr) => {
    tr.classList.remove("game-row-marked");
  });
  gameTableHead.querySelectorAll(".game-hint-blink, .game-hint-done").forEach((el) => {
    el.classList.remove("game-hint-blink", "game-hint-done");
  });
  gameTableBody.querySelectorAll(".game-hint-blink, .game-hint-done").forEach((el) => {
    el.classList.remove("game-hint-blink", "game-hint-done");
  });
}

function refreshAlgoHeaderCells() {
  algoHeaderCells = [...gameTableHead.querySelectorAll("th[data-algo-col]")];
}

function getAlgoHeader(colIdx) {
  return algoHeaderCells[colIdx] ?? null;
}

function getRowNumCell(row) {
  return getRowTr(row)?.querySelector(".truth-table__num");
}

function pulseHint(el) {
  if (!el) {
    return;
  }
  /* Мигание отключено — только плавное закрашивание в зелёный.
  el.classList.remove("game-hint-blink");
  void el.offsetWidth;
  el.classList.add("game-hint-blink");
  const onEnd = () => {
    el.classList.remove("game-hint-blink");
    void el.offsetWidth;
    el.classList.add("game-hint-done");
    el.removeEventListener("animationend", onEnd);
  };
  el.addEventListener("animationend", onEnd);
  */
  el.classList.remove("game-hint-done");
  void el.offsetWidth;
  el.classList.add("game-hint-done");
}

function step2KeysForColumn(colIdx) {
  return [...solution.step2Keys].filter((key) => Number(key.split(":")[1]) === colIdx);
}

function step3KeysForRow(row) {
  return [...solution.step3Keys].filter((key) => Number(key.split(":")[0]) === row);
}

function isStepKeyMarked(key) {
  const [row, colIdx] = key.split(":").map(Number);
  return isAlgoCellMarked(row, colIdx);
}

function isColumnStep2Complete(colIdx) {
  const keys = step2KeysForColumn(colIdx);
  if (keys.length === 0) {
    return false;
  }
  return keys.every(isStepKeyMarked);
}

function isRowStep3Complete(row) {
  const keys = step3KeysForRow(row);
  if (keys.length === 0) {
    return false;
  }
  return keys.every(isStepKeyMarked);
}

function checkStep2ColumnHints(onlyColIdx) {
  if (gameStep !== 1 || onlyColIdx == null || onlyColIdx < 0) {
    return;
  }
  if (hintColsDone.has(onlyColIdx) || !isColumnStep2Complete(onlyColIdx)) {
    return;
  }
  hintColsDone.add(onlyColIdx);
  pulseHint(getAlgoHeader(onlyColIdx));
}

function checkStep3RowHints(onlyRow) {
  if (gameStep !== 2 || onlyRow == null || onlyRow < 0) {
    return;
  }
  if (hintRowsDone.has(onlyRow) || !isRowStep3Complete(onlyRow)) {
    return;
  }
  hintRowsDone.add(onlyRow);
  pulseHint(getRowNumCell(onlyRow));
}

/** Столбец на шаге 2 уже «готов»: нечего зачёркивать или всё зачёркнуто. */
function isColumnStep2Ready(colIdx) {
  const keys = step2KeysForColumn(colIdx);
  if (keys.length === 0) {
    return true;
  }
  return keys.every(isStepKeyMarked);
}

/** Строка на шаге 3 уже «готова»: нечего зачёркивать или всё зачёркнуто. */
function isRowStep3Ready(row) {
  const keys = step3KeysForRow(row);
  if (keys.length === 0) {
    return true;
  }
  return keys.every(isStepKeyMarked);
}

function markCompletedStep2Hints() {
  for (let colIdx = 0; colIdx < algoHeaderCells.length; colIdx += 1) {
    if (hintColsDone.has(colIdx) || !isColumnStep2Ready(colIdx)) {
      continue;
    }
    hintColsDone.add(colIdx);
    pulseHint(getAlgoHeader(colIdx));
  }
}

function markCompletedStep3Hints() {
  const rows = gameTableBody.querySelectorAll("tr").length;
  for (let row = 0; row < rows; row += 1) {
    if (hintRowsDone.has(row) || !isRowStep3Ready(row)) {
      continue;
    }
    hintRowsDone.add(row);
    pulseHint(getRowNumCell(row));
  }
}

async function applyHintsAfterStepTransition(fromStep, toStep) {
  if (!gameStarted) {
    return;
  }
  const maxStep = solution.hasStep4 ? 4 : 3;
  for (let step = fromStep + 1; step <= toStep && step < maxStep; step += 1) {
    await playStepBurst(step + 1);
    if (step === 1) {
      markCompletedStep2Hints();
    }
    if (step === 2) {
      markCompletedStep3Hints();
    }
  }
}

function applyGameMark(cell, delayMs = 0) {
  if (!cell || cell.classList.contains("game-mark")) {
    return;
  }
  const run = () => {
    if (!cell.isConnected || cell.classList.contains("game-mark")) {
      return;
    }
    cell.classList.add("game-mark", "game-mark-pop");
    const onPopEnd = (e) => {
      if (e.target !== cell || e.animationName !== "game-mark-pop") {
        return;
      }
      cell.classList.remove("game-mark-pop");
      cell.removeEventListener("animationend", onPopEnd);
    };
    cell.addEventListener("animationend", onPopEnd);
  };
  if (delayMs <= 0) {
    run();
    return;
  }
  const id = window.setTimeout(run, delayMs);
  rowMarkTimeouts.push(id);
}

function markRowStep1(tr, row) {
  if (markedStep1.has(row)) {
    return;
  }
  markedStep1.add(row);
  tr.classList.add("game-row-marked");
  const cells = [...tr.querySelectorAll("td")].filter(
    (td) => !td.classList.contains("truth-table__bit--before"),
  );
  const staggerMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : ROW_MARK_STAGGER_MS;
  cells.forEach((td, index) => {
    applyGameMark(td, index * staggerMs);
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
  applyGameMark(cell);
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

function step4Done() {
  if (!solution.hasStep4 || solution.step4Keys.size === 0) return true;
  return [...solution.step4Keys].every((key) => {
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
  if (gameStep === 3) {
    return step4Done();
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

async function advanceStep() {
  const fromStep = gameStep;
  const maxStep = solution.hasStep4 ? 4 : 3;
  gameStep += 1;

  while (gameStep < maxStep && isCurrentStepDone()) {
    gameStep += 1;
  }

  updateHud();
  await applyHintsAfterStepTransition(fromStep, gameStep);

  if (gameStep >= maxStep) {
    await finishGame();
  }
}

async function tryAutoAdvance() {
  const fromStep = gameStep;
  const maxStep = solution.hasStep4 ? 4 : 3;
  while (gameStarted && gameStep < maxStep && isCurrentStepDone()) {
    gameStep += 1;
  }
  updateHud();
  await applyHintsAfterStepTransition(fromStep, gameStep);
  if (gameStep >= maxStep) {
    await finishGame();
  }
}

async function finishGame() {
  if (!gameStarted) {
    return;
  }
  gameStarted = false;
  const elapsed = stopTimer();
  const stats = GameStore.recordWin(elapsed, formatResultMdnf());
  if (stats.storageWarning) {
    showToast("Мало места в браузере — результат мог сохраниться не полностью");
  }
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

  await playWinBurst();
  showResultModal();
}

async function handleStep1Click(tr, row) {
  if (!isZeroRow(row)) {
    flash("err");
    return;
  }
  if (markedStep1.has(row)) {
    return;
  }
  markRowStep1(tr, row);
  if (step1Done()) {
    await advanceStep();
  }
}

async function handleStep2Click(cell, row, colIdx) {
  if (step2Done()) {
    await advanceStep();
    return;
  }
  const key = TruthTable.cellKey(row, colIdx);
  if (!solution.step2Keys.has(key)) {
    flash("err");
    return;
  }
  ensureCellMarked(cell, markedStep2, key);
  checkStep2ColumnHints(colIdx);
  if (step2Done()) {
    await advanceStep();
  }
}

async function handleStep3Click(cell, row, colIdx) {
  if (step3Done()) {
    await advanceStep();
    return;
  }
  const key = TruthTable.cellKey(row, colIdx);
  if (!solution.step3Keys.has(key)) {
    flash("err");
    return;
  }
  ensureCellMarked(cell, markedStep3, key);
  checkStep3RowHints(row);
  if (step3Done()) {
    await advanceStep();
  }
}

async function handleStep4Click(cell, row, colIdx) {
  // Ошибки не учитываются: неверный клик молча игнорируется
  if (step4Done()) {
    await advanceStep();
    return;
  }
  const key = TruthTable.cellKey(row, colIdx);
  if (!solution.step4Keys.has(key)) {
    return; // игнорируем — без flash("err")
  }
  ensureCellMarked(cell, markedStep4, key);
  if (step4Done()) {
    await advanceStep();
  }
}

async function onGameCellClick(e) {
  if (!gameStarted) {
    showToast("Сначала нажмите «Начать» — тогда запустится таймер");
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
    await handleStep1Click(tr, row);
    return;
  }

  const algoCell = td.classList.contains("truth-table__algo-col")
    ? td
    : td.closest(".truth-table__algo-col");

  if (algoCell) {
    const colIdx = Number(algoCell.dataset.algoCol);
    if (gameStep === 1) {
      await handleStep2Click(algoCell, row, colIdx);
    } else if (gameStep === 2) {
      await handleStep3Click(algoCell, row, colIdx);
    } else if (gameStep === 3) {
      await handleStep4Click(algoCell, row, colIdx);
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
    gameCompact: true,
  });
  refreshAlgoHeaderCells();
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
  [gameStepBurst, gameWinBurst].forEach((el) => {
    if (!el) {
      return;
    }
    el.classList.remove("is-active", "is-leaving", "is-interactive");
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
  });
  stepBurstChain = Promise.resolve();
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

async function startSoloGame() {
  gameInstruction.hidden = true;
  gameTableWrap.classList.remove("game-table-wrap--dimmed");
  gameStarted = true;
  gameStep = 0;
  clearGameMarks();
  updateHud();
  startTimer();
  await playStepBurst(1);
  await tryAutoAdvance();
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
