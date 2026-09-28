/** Prototype session. Cookie only: there is no identity provider. */

export const SESSION_COOKIE = "mulya-session";

export const DEMO_EMAIL = "operator@mulya.ai";
export const DEMO_PASSWORD = "estimate";
export const DEMO_NAME = "Design Operator";

export function credentialsMatch(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function writeSession(): void {
  document.cookie = `${SESSION_COOKIE}=operator; path=/; max-age=31536000; samesite=lax`;
}

export function clearSession(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}
