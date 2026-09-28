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

/**
 * Inline <head> script: the site is a static export with no server, so the
 * sign-in redirect runs in the browser before first paint. Signed-out visitors
 * go to /login (remembering where they were headed); signed-in ones skip it.
 * A demo gate only: the credentials above ship in the client bundle anyway.
 */
export const SESSION_GATE_SCRIPT = `(function(){try{var l=location,p=l.pathname,s=/(?:^|; )${SESSION_COOKIE}=[^;]/.test(document.cookie),i=/^\\/login\\/?$/.test(p);if(!s&&!i){l.replace("/login/"+(p==="/"?"":"?next="+encodeURIComponent(p+l.search)))}else if(s&&i){l.replace("/")}}catch(e){}})()`;

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}
