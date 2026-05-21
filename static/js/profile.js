const avatarEl = document.getElementById("profile-avatar");
const avatarInitials = document.getElementById("profile-avatar-initials");
const avatarInput = document.getElementById("profile-avatar-input");
const avatarRemoveBtn = document.getElementById("profile-avatar-remove");
const nameInput = document.getElementById("profile-name");
const saveStatus = document.getElementById("profile-save-status");

let profile = ProfileStore.loadProfile();

function showStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.hidden = false;
  saveStatus.classList.toggle("profile-save-status--error", isError);
  window.clearTimeout(showStatus._timer);
  showStatus._timer = window.setTimeout(() => {
    saveStatus.hidden = true;
  }, isError ? 4000 : 2000);
}

function renderProfile() {
  nameInput.value = profile.name;
  avatarInitials.textContent = ProfileStore.initials(profile.name);
  avatarRemoveBtn.hidden = !profile.avatar;

  if (profile.avatar) {
    avatarEl.style.backgroundImage = `url(${profile.avatar})`;
    avatarInitials.hidden = true;
    avatarEl.classList.add("profile-avatar--has-image");
  } else {
    avatarEl.style.backgroundImage = "";
    avatarInitials.hidden = false;
    avatarEl.classList.remove("profile-avatar--has-image");
  }
}

function persistProfile() {
  try {
    profile = ProfileStore.saveProfile({ ...profile, name: nameInput.value });
    renderProfile();
    showStatus("Сохранено на этом устройстве");
  } catch (err) {
    showStatus(err.message || "Не удалось сохранить", true);
  }
}

avatarEl.addEventListener("click", () => avatarInput.click());
avatarEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    avatarInput.click();
  }
});

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files?.[0];
  avatarInput.value = "";
  if (!file) {
    return;
  }

  try {
    const dataUrl = await ProfileStore.fileToAvatarDataUrl(file);
    profile = ProfileStore.saveProfile({ ...profile, avatar: dataUrl });
    renderProfile();
    showStatus("Аватар сохранён локально");
  } catch (err) {
    showStatus(err.message || "Ошибка загрузки", true);
  }
});

avatarRemoveBtn.addEventListener("click", () => {
  try {
    profile = ProfileStore.saveProfile({ ...profile, avatar: null });
    renderProfile();
    showStatus("Аватар удалён");
  } catch (err) {
    showStatus(err.message || "Не удалось сохранить", true);
  }
});

nameInput.addEventListener("input", () => {
  if (!profile.avatar) {
    avatarInitials.textContent = ProfileStore.initials(nameInput.value || "?");
  }
});

nameInput.addEventListener("change", persistProfile);

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    nameInput.blur();
    persistProfile();
  }
});

function renderStats() {
  const summary = GameStore.computeProfileSummary();

  document.getElementById("profile-best-time").textContent =
    summary.bestTimeMs === null ? "—" : GameStore.formatTime(summary.bestTimeMs);
  document.getElementById("profile-avg-time").textContent =
    summary.avgTimeMs === null ? "—" : GameStore.formatTime(summary.avgTimeMs);
  document.getElementById("profile-games").textContent = String(summary.gamesPlayed);
  document.getElementById("profile-flashes").textContent = String(summary.totalFlashes);
  document.getElementById("profile-flashes-per-game").textContent =
    summary.flashesPerGame === null ? "—" : String(summary.flashesPerGame);
  document.getElementById("profile-unique-mdnf").textContent = String(summary.uniqueMdnf);
  document.getElementById("profile-last-played").textContent =
    summary.lastPlayedAt === null ? "—" : GameStore.formatHistoryDate(summary.lastPlayedAt);
}

function renderHistory() {
  const tbody = document.getElementById("profile-history-body");
  if (!tbody) {
    return;
  }
  const history = GameStore.loadHistory();
  tbody.replaceChildren();

  if (history.length === 0) {
    const row = document.createElement("tr");
    row.className = "profile-history__empty";
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "Пока нет завершённых игр";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement("tr");

    const timeCell = document.createElement("td");
    timeCell.className = "profile-history__time";
    timeCell.textContent = GameStore.formatTime(entry.timeMs);

    const mdnfCell = document.createElement("td");
    mdnfCell.className = "profile-history__mdnf";
    mdnfCell.textContent = entry.mdnf;

    const dateCell = document.createElement("td");
    dateCell.className = "profile-history__date";
    dateCell.textContent = GameStore.formatHistoryDate(entry.playedAt);

    row.append(timeCell, mdnfCell, dateCell);
    tbody.appendChild(row);
  });
}

renderProfile();
renderStats();
renderHistory();
