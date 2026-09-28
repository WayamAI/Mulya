/**
 * Theme constants shared by the server layout and the client provider.
 * Kept out of the "use client" provider module: a server component that
 * imports a value from a client module gets a client reference, not the
 * string, so the cookie lookup would silently miss.
 */

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "mulya-theme";

/**
 * Inline <head> script: applies the saved theme (cookie, then localStorage) to
 * <html> before first paint, so a dark reload never flashes light. Runs before
 * React; keep it tiny and dependency-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)},m=document.cookie.match(new RegExp("(?:^|; )"+k+"=(dark|light)")),t=m&&m[1];if(!t){try{t=localStorage.getItem(k)}catch(e){}}if(t!=="dark")t="light";var d=document.documentElement;d.setAttribute("data-theme",t);d.style.colorScheme=t}catch(e){}})()`;
