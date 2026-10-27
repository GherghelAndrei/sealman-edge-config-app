import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { ExtensionContribution, ExtensionPanelProps } from "./contract";
import { loadExtensionPanel } from "./federation";

// One lazy component per contribution, kept outside React. The slot renders it inside a Suspense
// boundary, and React discards state of components that suspend before mounting, so a lazy()
// created during render would be recreated on every retry and suspend forever. A failed load is
// evicted so a remount retries it.
const lazyPanels = new Map<string, LazyExoticComponent<ComponentType<ExtensionPanelProps>>>();

export function getLazyExtensionPanel(
  c: ExtensionContribution
): LazyExoticComponent<ComponentType<ExtensionPanelProps>> {
  const key = `${c.extension}|${c.entry}|${c.module}`;
  let Panel = lazyPanels.get(key);
  if (!Panel) {
    Panel = lazy(async () => {
      try {
        return { default: await loadExtensionPanel(c) };
      } catch (error) {
        lazyPanels.delete(key);
        throw error;
      }
    });
    lazyPanels.set(key, Panel);
  }
  return Panel;
}

/** Test hook: forget cached panels so each test starts from a cold load. */
export function resetExtensionPanelCache(): void {
  lazyPanels.clear();
}
