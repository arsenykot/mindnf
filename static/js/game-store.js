const STATS_KEY = "mindnf_game_stats";
const HISTORY_KEY = "mindnf_game_history";
const HISTORY_MAX = 100;

const DEFAULT_STATS = {
  bestTimeMs: null,
  gamesPlayed: 0,
  wins: 0,
  totalFlashes: 0,
};

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
  localStorage.setItem(STATS_KEY, JSON.stringify(payload));
  return payload;
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
  const payload = history.slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(payload));
  return payload;
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
  saveHistory(history);
  return saveStats(stats);
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
  return saveStats(stats);
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${tenths}`;
}

window.GameStore = {
  STATS_KEY,
  HISTORY_KEY,
  HISTORY_MAX,
  loadStats,
  saveStats,
  loadHistory,
  saveHistory,
  recordWin,
  recordFlash,
  formatTime,
  formatHistoryDate,
};
