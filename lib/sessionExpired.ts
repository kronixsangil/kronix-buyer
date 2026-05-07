// lib/sessionExpired.ts
"use client";

const KEY = "kronix:auth:expiredShown:v1";

/**
 * Marca y emite evento de "sesión expirada" SOLO una vez por sesión de navegador (tab).
 * - No vuelve a emitir hasta que alguien llame clearSessionExpiredShown()
 */
export function emitSessionExpiredOnce() {
  try {
    const already = sessionStorage.getItem(KEY);
    if (already === "1") return;

    sessionStorage.setItem(KEY, "1");
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
  } catch {
    // Si falla sessionStorage, al menos emitimos una vez (mejor que romper)
    try {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    } catch {}
  }
}

/** Reset: úsalo cuando el usuario haga login exitoso */
export function clearSessionExpiredShown() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}