/** Вызов по ссылке: ?challenge=… · ?host=… (мс) · ?nick=… */

const CHALLENGE_ROWS = 8;
const NICK_MAX_LEN = 32;

function sanitizeNick(name) {
  if (typeof name !== "string") {
    return "";
  }
  return name
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, NICK_MAX_LEN);
}

function loadHostNick() {
  if (window.ProfileStore?.loadProfile) {
    return sanitizeNick(window.ProfileStore.loadProfile().name);
  }
  try {
    const raw = localStorage.getItem("mindnf_profile");
    if (!raw) {
      return "";
    }
    const data = JSON.parse(raw);
    return sanitizeNick(data.name);
  } catch {
    return "";
  }
}

function resolveHostNick(explicit) {
  const nick = sanitizeNick(explicit);
  return nick || "Игрок";
}

function fValuesToId(fValues) {
  let bits = 0;
  for (let i = 0; i < fValues.length; i += 1) {
    if (fValues[i] === "1") {
      bits |= 1 << i;
    }
  }
  return bits.toString(36);
}

function idToFValues(id, rows = CHALLENGE_ROWS) {
  const bits = Number.parseInt(id, 36);
  if (!Number.isFinite(bits) || bits < 0 || bits >= 2 ** rows) {
    return null;
  }
  return Array.from({ length: rows }, (_, i) => ((bits >> i) & 1 ? "1" : "0"));
}

function randomFValues(rows = CHALLENGE_ROWS) {
  const allOnes = (1 << rows) - 1;
  let bits;
  do {
    bits = Math.floor(Math.random() * (1 << rows));
  } while (bits === 0 || bits === allOnes);
  return idToFValues(bits.toString(36), rows);
}

function buildUrl(fValues, hostTimeMs, hostNick) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("challenge", fValuesToId(fValues));
  const nick = resolveHostNick(hostNick ?? loadHostNick());
  url.searchParams.set("nick", nick);
  if (hostTimeMs != null && Number.isFinite(hostTimeMs)) {
    url.searchParams.set("host", String(Math.round(hostTimeMs)));
  }
  return url.toString();
}

function parseFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("challenge");
  if (!id) {
    return null;
  }
  const fValues = idToFValues(id);
  if (!fValues) {
    return null;
  }
  const hostRaw = params.get("host");
  let hostTimeMs = null;
  if (hostRaw != null && hostRaw !== "") {
    const host = Number(hostRaw);
    if (Number.isFinite(host) && host >= 0) {
      hostTimeMs = host;
    }
  }
  const hostNick = resolveHostNick(params.get("nick") ?? "");

  return { fValues, hostTimeMs, hostNick, id };
}

function clearUrlParams() {
  const url = new URL(window.location.href);
  if (
    !url.searchParams.has("challenge")
    && !url.searchParams.has("host")
    && !url.searchParams.has("nick")
  ) {
    return;
  }
  url.searchParams.delete("challenge");
  url.searchParams.delete("host");
  url.searchParams.delete("nick");
  const next = url.pathname + (url.search || "") + url.hash;
  window.history.replaceState({}, "", next);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

window.GameChallenge = {
  CHALLENGE_ROWS,
  NICK_MAX_LEN,
  fValuesToId,
  idToFValues,
  randomFValues,
  sanitizeNick,
  loadHostNick,
  buildUrl,
  parseFromUrl,
  clearUrlParams,
  copyText,
};
