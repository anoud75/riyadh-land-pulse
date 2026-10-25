import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const KEY = "chunk-reload";
const WINDOW_MS = 10_000;
let tried = false;

/**
 * Reload the page once when a lazily loaded module can't be fetched — an old page
 * can hold a module URL that a new deploy or a dev-server restart has replaced.
 * Guarded so a genuinely broken module can never cause an endless reload loop.
 */
export function reloadOnce() {
  if (tried) return;
  tried = true;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (last && Date.now() - last < WINDOW_MS) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // storage blocked — still worth one reload
  }
  window.location.reload();
}

/** React.lazy that reloads once instead of blanking the screen when the chunk is gone. */
export function lazyWithReload<P extends object>(
  factory: () => Promise<{ default: ComponentType<P> }>,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() =>
    factory().catch((err: unknown) => {
      reloadOnce();
      throw err;
    }),
  );
}
