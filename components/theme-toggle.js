const STORAGE_KEY = "site-theme";
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_LIGHT = "light";
const THEME_DARK = "dark";

let hasUserOverride = false;

function isValidTheme(value) {
  return value === THEME_LIGHT || value === THEME_DARK;
}

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // Ignore storage errors in restricted contexts.
  }
}

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia(SYSTEM_DARK_QUERY).matches) {
    return THEME_DARK;
  }
  return THEME_LIGHT;
}

function getCurrentTheme() {
  var current = document.documentElement.getAttribute("data-theme");
  if (isValidTheme(current)) {
    return current;
  }
  return THEME_LIGHT;
}

function applyTheme(theme) {
  var normalized = isValidTheme(theme) ? theme : THEME_LIGHT;
  document.documentElement.setAttribute("data-theme", normalized);
}

function ensureToggleButton() {
  var existing = document.getElementById("theme-toggle");
  if (existing) {
    return existing;
  }

  var button = document.createElement("button");
  button.id = "theme-toggle";
  button.className = "theme-toggle";
  button.type = "button";

  var icon = document.createElement("i");
  icon.className = "theme-toggle-icon fa-solid";
  icon.setAttribute("aria-hidden", "true");

  var label = document.createElement("span");
  label.className = "theme-toggle-label";

  button.appendChild(icon);
  button.appendChild(label);
  document.body.appendChild(button);
  return button;
}

function updateToggleButton(theme) {
  var button = ensureToggleButton();
  var icon = button.querySelector(".theme-toggle-icon");
  var label = button.querySelector(".theme-toggle-label");
  var isDark = theme === THEME_DARK;

  if (icon) {
    icon.classList.remove("fa-moon", "fa-sun");
    icon.classList.add(isDark ? "fa-moon" : "fa-sun");
  }
  if (label) {
    label.textContent = isDark ? "Escuro" : "Claro";
  }

  button.setAttribute("aria-pressed", isDark ? "true" : "false");
  button.setAttribute("aria-label", isDark ? "Trocar para modo claro" : "Trocar para modo escuro");
  button.setAttribute("title", isDark ? "Trocar para modo claro" : "Trocar para modo escuro");
}

function bindSystemThemeChanges() {
  if (!window.matchMedia || window.__themeSystemListenerBound) {
    return;
  }
  window.__themeSystemListenerBound = true;

  var mediaQuery = window.matchMedia(SYSTEM_DARK_QUERY);
  var onSystemThemeChange = function (event) {
    if (hasUserOverride) {
      return;
    }
    var nextTheme = event.matches ? THEME_DARK : THEME_LIGHT;
    applyTheme(nextTheme);
    updateToggleButton(nextTheme);
  };

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onSystemThemeChange);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(onSystemThemeChange);
  }
}

export function initThemeToggle() {
  var storedTheme = readStoredTheme();
  hasUserOverride = isValidTheme(storedTheme);

  var initialTheme = hasUserOverride ? storedTheme : getSystemTheme();
  applyTheme(initialTheme);

  if (!window.__themeToggleBound) {
    window.__themeToggleBound = true;

    var button = ensureToggleButton();
    button.addEventListener("click", function () {
      var nextTheme = getCurrentTheme() === THEME_DARK ? THEME_LIGHT : THEME_DARK;
      hasUserOverride = true;
      writeStoredTheme(nextTheme);
      applyTheme(nextTheme);
      updateToggleButton(nextTheme);
    });
  }

  updateToggleButton(getCurrentTheme());
  bindSystemThemeChanges();
}
