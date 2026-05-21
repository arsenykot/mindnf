const STORAGE_KEY = "mindnf_profile";

const DEFAULT_PROFILE = {
  name: "Игрок",
  avatar: null,
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PROFILE };
    }
    const data = JSON.parse(raw);
    return {
      name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : DEFAULT_PROFILE.name,
      avatar: data.avatar ?? null,
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile(profile) {
  const payload = {
    name: (profile.name || DEFAULT_PROFILE.name).trim() || DEFAULT_PROFILE.name,
    avatar: profile.avatar ?? null,
  };
  const json = JSON.stringify(payload);
  const result = window.GameStore?.setStorageItem
    ? window.GameStore.setStorageItem(STORAGE_KEY, json)
    : (() => {
        try {
          localStorage.setItem(STORAGE_KEY, json);
          return { ok: true, quotaExceeded: false };
        } catch (err) {
          return {
            ok: false,
            quotaExceeded: err?.name === "QuotaExceededError" || err?.code === 22,
          };
        }
      })();

  if (!result.ok) {
    if (result.quotaExceeded) {
      throw new Error("Недостаточно места в браузере. Удалите аватар или очистите историю игр.");
    }
    throw new Error("Не удалось сохранить профиль.");
  }
  return payload;
}

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AVATAR_PX = 256;
const MAX_AVATAR_BYTES = 350_000;

function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Выберите файл изображения (JPG, PNG, WebP)."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_PX;
        canvas.height = AVATAR_PX;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(AVATAR_PX / img.width, AVATAR_PX / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (AVATAR_PX - w) / 2, (AVATAR_PX - h) / 2, w, h);

        let quality = 0.88;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > MAX_AVATAR_BYTES && quality > 0.45) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        if (dataUrl.length > MAX_AVATAR_BYTES) {
          reject(new Error("Изображение слишком большое. Попробуйте другой файл."));
          return;
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Не удалось прочитать изображение."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Не удалось открыть файл."));
    reader.readAsDataURL(file);
  });
}

window.ProfileStore = {
  STORAGE_KEY,
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  initials,
  fileToAvatarDataUrl,
};
