/**
 * The pre-paint theme script, kept out of theme.ts ('use client') so the root layout (a server component)
 * can import the string. It sets <html data-theme="light|dark"> from the saved choice, else the OS, before
 * first paint, so there is no flash. Keep it in step with resolve() in theme.ts.
 */
export const THEME_KEY = 'otw:theme';

export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem('${THEME_KEY}');var d=c==='dark'||(c!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
