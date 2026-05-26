const KEY = "omni_dashboard_prefs_v1";

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePrefs(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next || {}));
  } catch {
    // ignore
  }
}

