/**
 * Server-side auth helpers.
 *
 * A single `DASHBOARD_PASSWORD` env var gates the whole dashboard. When set,
 * the app requires a session cookie whose value is a stateless token derived
 * from that password (checked by middleware). When unset, auth is disabled.
 */

export const SESSION_COOKIE = "letta_auth_session";

export function isAuthEnabled(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

/** Stateless session token derived from the configured password. */
export function getSessionToken(): string {
  const password = process.env.DASHBOARD_PASSWORD ?? "";
  if (!password) return "";
  try {
    // encodeURIComponent keeps the input ASCII so btoa() is safe (works in
    // both the Node runtime and the Edge middleware runtime).
    return btoa(encodeURIComponent(password));
  } catch {
    return password;
  }
}

export function isValidSessionToken(token: string | undefined): boolean {
  const expected = getSessionToken();
  return Boolean(expected) && token === expected;
}
