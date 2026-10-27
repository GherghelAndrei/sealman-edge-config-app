import { Component, Fragment, Suspense, useCallback, useMemo } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  EXTENSION_PANEL_CONTRACT_VERSION,
  type ExtensionContribution,
  type ExtensionPanelProps,
  type ExtensionSlotContexts,
  type ExtensionSlotName,
} from "./contract";
import { createExtensionApi } from "./createExtensionApi";
import { getLazyExtensionPanel } from "./lazyPanel";
import { useExtensionContributions } from "./useExtensionContributions";

type ExtensionSlotProps<S extends ExtensionSlotName> = {
  name: S;
  /** Passed to each panel as `props.context`; its shape is fixed per slot in `slots.ts`. */
  context: ExtensionSlotContexts[S];
  onDataChanged?: () => void;
  /** Wraps each contribution in the host page's own frame (card, section...). Default: heading + panel. */
  renderFrame?: (label: string, panel: ReactNode) => ReactNode;
};

const noop = () => {};

const SEVERITIES = { info: 1, success: 1, warning: 1, error: 1 };

function UnavailableCard({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label} unavailable</p>;
}

class PanelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Extension panel failed", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type PanelProps = {
  contribution: ExtensionContribution;
  slot: ExtensionSlotName;
  /** The slot context as JSON: pages pass it as an inline literal, so this keeps its identity stable. */
  contextKey: string;
  onDataChanged?: () => void;
};

function ContributionPanel({ contribution: c, slot, contextKey, onDataChanged }: PanelProps) {
  // The cache, not this memo, keeps the identity: this component sits inside the Suspense
  // boundary, so its memo is discarded on every retry while the panel is still loading.
  const Panel = useMemo(
    () => getLazyExtensionPanel(c),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c.extension, c.entry, c.module]
  );
  const api = useMemo(() => createExtensionApi(), []);

  const notify = useCallback<ExtensionPanelProps["notify"]>((n) => {
    // severity comes from the remote: fall back to info for unknown values
    const show = Object.hasOwn(SEVERITIES, n.severity) ? toast[n.severity] : toast.info;
    show(n.message);
  }, []);
  const props = useMemo(
    () =>
      ({
        contractVersion: EXTENSION_PANEL_CONTRACT_VERSION,
        slot,
        context: JSON.parse(contextKey) as ExtensionSlotContexts[ExtensionSlotName],
        api,
        notify,
        onDataChanged: onDataChanged ?? noop,
      }) as ExtensionPanelProps,
    [slot, contextKey, api, notify, onDataChanged]
  );

  return <Panel {...props} />;
}

export default function ExtensionSlot<S extends ExtensionSlotName>({
  name,
  context,
  onDataChanged,
  renderFrame,
}: ExtensionSlotProps<S>) {
  const { contributions } = useExtensionContributions(name);
  if (!contributions.length) return null;
  const contextKey = JSON.stringify(context);

  return (
    <>
      {contributions.map((c) => {
        const panel = (
          <PanelErrorBoundary
            key={contextKey}
            fallback={<UnavailableCard label={c.label} />}>
            <Suspense fallback={<Loader2 className="animate-spin" size={16} />}>
              <ContributionPanel
                contribution={c}
                slot={name}
                contextKey={contextKey}
                onDataChanged={onDataChanged}
              />
            </Suspense>
          </PanelErrorBoundary>
        );
        return (
          <Fragment key={`${c.extension}|${c.module}`}>
            {renderFrame ? (
              renderFrame(c.label, panel)
            ) : (
              <section>
                <h3>{c.label}</h3>
                {panel}
              </section>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
