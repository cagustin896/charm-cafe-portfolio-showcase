export function loadLocalState(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? mergeWithFallback(fallback, JSON.parse(raw)) : fallback;
  } catch {
    return fallback;
  }
}

function mergeWithFallback(fallback, saved) {
  if (Array.isArray(fallback)) return Array.isArray(saved) ? saved : fallback;
  if (!fallback || typeof fallback !== "object") return saved ?? fallback;

  return Object.keys(fallback).reduce((merged, key) => {
    merged[key] = mergeWithFallback(fallback[key], saved?.[key]);
    return merged;
  }, { ...saved });
}

export function saveLocalState(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
