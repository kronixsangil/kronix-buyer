// lib/sessionExpired.ts
// lib/sessionExpired.ts
"use client";

const KEY = "kronix:auth:expiredShown:v1";
const ACTIVE_KEY = "kronix:auth:knownActive:v1";
const LOGOUT_KEY = "kronix:auth:voluntaryLogout:v1";
const LS_USER_ID = "kronix:auth:userId:v1";

function hasCachedUserId() {
  try {
    return Boolean(String(localStorage.getItem(LS_USER_ID) ?? "").trim());
  } catch {
    return false;
  }
}

export function markSessionKnownActive() {
  try {
    sessionStorage.setItem(ACTIVE_KEY, "1");
    sessionStorage.removeItem(LOGOUT_KEY);
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function markVoluntaryLogout() {
  try {
    sessionStorage.setItem(LOGOUT_KEY, "1");
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function shouldShowSessionExpired() {
  try {
    if (sessionStorage.getItem(LOGOUT_KEY) === "1") return false;
    if (sessionStorage.getItem(ACTIVE_KEY) === "1") return true;
    return hasCachedUserId();
  } catch {
    return hasCachedUserId();
  }
}

/**
 * Marca y emite evento de "sesión expirada" SOLO cuando sabemos que antes hubo sesión real.
 * Evita mostrar el modal en primera instalación, primera apertura o logout voluntario.
 */
export function emitSessionExpiredOnce() {
  if (typeof window === "undefined") return;
  if (!shouldShowSessionExpired()) return;

  try {
    const already = sessionStorage.getItem(KEY);
    if (already === "1") return;

    sessionStorage.setItem(KEY, "1");
    window.dispatchEvent(new CustomEvent("auth:session-expired"));
  } catch {
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
