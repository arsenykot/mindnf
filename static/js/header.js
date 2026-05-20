function initSiteHeader() {
  const header = document.getElementById("site-header");
  const toggle = document.getElementById("site-header-toggle");
  const nav = document.getElementById("site-header-nav");
  if (!header || !toggle || !nav) {
    return;
  }

  const mq = window.matchMedia("(max-width: 640px)");

  function closeMenu() {
    header.classList.remove("site-header--open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    header.classList.add("site-header--open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", () => {
    if (header.classList.contains("site-header--open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  mq.addEventListener("change", (e) => {
    if (!e.matches) {
      closeMenu();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSiteHeader);
} else {
  initSiteHeader();
}
