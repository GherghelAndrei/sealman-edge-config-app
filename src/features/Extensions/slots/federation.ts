import type { ComponentType } from "react";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactQuery from "@tanstack/react-query";
import { createInstance } from "@module-federation/runtime";
import type { ModuleFederation } from "@module-federation/runtime";
import pkg from "../../../../package.json";
import rqPkg from "@tanstack/react-query/package.json";
import type { ExtensionContribution, ExtensionPanelProps } from "./contract";

type SharedOptions = NonNullable<Parameters<typeof createInstance>[0]["shared"]>;

function sharedSingleton(version: string, requiredVersion: string, lib: object): SharedOptions[string] {
  return { version, lib: () => lib, shareConfig: { singleton: true, requiredVersion } };
}

let instance: ModuleFederation | undefined;

/** The single runtime federation instance. Shares react, react-dom and react-query with remotes. */
export function getFederation(): ModuleFederation {
  if (!instance) {
    const deps = pkg.dependencies;
    instance = createInstance({
      name: "sealman",
      remotes: [],
      shared: {
        react: sharedSingleton(React.version, deps.react, React),
        "react-dom": sharedSingleton(ReactDOM.version, deps["react-dom"], ReactDOM),
        "@tanstack/react-query": sharedSingleton(
          rqPkg.version,
          deps["@tanstack/react-query"],
          ReactQuery
        ),
      },
    });
  }
  return instance;
}

const registered = new Map<string, string>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, remoteName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out loading ${remoteName}`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function loadExtensionPanel(
  c: ExtensionContribution,
  timeoutMs = 10_000
): Promise<ComponentType<ExtensionPanelProps>> {
  const federation = getFederation();
  const previousEntry = registered.get(c.remoteName);
  if (previousEntry !== c.entry) {
    const remote = [{ name: c.remoteName, entry: c.entry, type: "module" as const }];
    if (previousEntry === undefined) federation.registerRemotes(remote);
    else federation.registerRemotes(remote, { force: true });
    registered.set(c.remoteName, c.entry);
  }
  const id = `${c.remoteName}/${c.module.replace(/^\.\//, "")}`;
  const mod = await withTimeout(
    federation.loadRemote<{ default?: ComponentType<ExtensionPanelProps> }>(id),
    timeoutMs,
    c.remoteName
  );
  if (!mod?.default) {
    throw new Error(`Extension module ${id} has no default export`);
  }
  return mod.default;
}
