const STATS_KEY = "mindnf_game_stats";
const HISTORY_KEY = "mindnf_game_history";
const HISTORY_MAX = 100;

const DEFAULT_STATS = {
  bestTimeMs: null,
  gamesPlayed: 0,
  wins: 0,
  totalFlashes: 0,
};

function isQuotaError(err) {
  return (
    err
    && (err.name === "QuotaExceededError"
      || err.name === "NS_ERROR_DOM_QUOTA_REACHED"
      || err.code === 22
      || err.code === 1014)
  );
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true, quotaExceeded: false };
  } catch (err) {
    return { ok: false, quotaExceeded: isQuotaError(err) };
  }
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return { ...DEFAULT_STATS };
    }
    const data = JSON.parse(raw);
    return {
      bestTimeMs: typeof data.bestTimeMs === "number" ? data.bestTimeMs : null,
      gamesPlayed: Number(data.gamesPlayed) || 0,
      wins: Number(data.wins) || 0,
      totalFlashes: Number(data.totalFlashes) || 0,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats) {
  const payload = {
    bestTimeMs: stats.bestTimeMs,
    gamesPlayed: stats.gamesPlayed,
    wins: stats.wins,
    totalFlashes: stats.totalFlashes,
  };
  const result = setStorageItem(STATS_KEY, JSON.stringify(payload));
  return { saved: result.ok, stats: payload, quotaExceeded: result.quotaExceeded };
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .filter(
        (row) =>
          row
          && typeof row.timeMs === "number"
          && Number.isFinite(row.timeMs)
          && typeof row.playedAt === "number",
      )
      .map((row) => ({
        timeMs: row.timeMs,
        mdnf: typeof row.mdnf === "string" && row.mdnf.trim() ? row.mdnf.trim() : "—",
        playedAt: row.playedAt,
      }))
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  let payload = history.slice(0, HISTORY_MAX);
  let result = setStorageItem(HISTORY_KEY, JSON.stringify(payload));

  while (!result.ok && result.quotaExceeded && payload.length > 1) {
    payload = payload.slice(0, Math.max(1, Math.floor(payload.length / 2)));
    result = setStorageItem(HISTORY_KEY, JSON.stringify(payload));
  }

  return { saved: result.ok, history: payload, quotaExceeded: result.quotaExceeded };
}

function recordWin(timeMs, mdnf = "—") {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.wins += 1;
  if (stats.bestTimeMs === null || timeMs < stats.bestTimeMs) {
    stats.bestTimeMs = timeMs;
  }
  const history = loadHistory();
  history.unshift({
    timeMs,
    mdnf: typeof mdnf === "string" && mdnf.trim() ? mdnf.trim() : "—",
    playedAt: Date.now(),
  });
  const historyResult = saveHistory(history);
  const statsResult = saveStats(stats);
  return {
    ...statsResult.stats,
    storageOk: historyResult.saved && statsResult.saved,
    storageWarning: !historyResult.saved || !statsResult.saved,
  };
}

function formatHistoryDate(ts) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function recordFlash() {
  const stats = loadStats();
  stats.totalFlashes += 1;
  const result = saveStats(stats);
  return { ...result.stats, storageOk: result.saved };
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${tenths}`;
}

function computeProfileSummary() {
  const stats = loadStats();
  const history = loadHistory();
  const times = history.map((row) => row.timeMs);
  const avgTimeMs =
    times.length > 0 ? Math.round(times.reduce((sum, t) => sum + t, 0) / times.length) : null;
  const flashesPerGame =
    stats.gamesPlayed > 0
      ? Math.round((stats.totalFlashes / stats.gamesPlayed) * 10) / 10
      : null;
  const uniqueMdnf = new Set(
    history.map((row) => row.mdnf).filter((m) => m && m !== "—"),
  ).size;

  return {
    bestTimeMs: stats.bestTimeMs,
    avgTimeMs,
    gamesPlayed: stats.gamesPlayed,
    totalFlashes: stats.totalFlashes,
    flashesPerGame,
    lastPlayedAt: history[0]?.playedAt ?? null,
    uniqueMdnf,
    historyCount: history.length,
  };
}

window.GameStore = {
  STATS_KEY,
  HISTORY_KEY,
  HISTORY_MAX,
  setStorageItem,
  loadStats,
  saveStats,
  loadHistory,
  saveHistory,
  recordWin,
  recordFlash,
  formatTime,
  formatHistoryDate,
  computeProfileSummary,
};
