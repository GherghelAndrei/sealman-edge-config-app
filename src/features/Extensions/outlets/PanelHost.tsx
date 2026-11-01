import { Component, Suspense, useCallback, useMemo } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { createExtensionApi } from "./createExtensionApi";
import { getLazyExtensionPanel } from "./lazyPanel";
import type { PanelProps } from "./sdk";
import type { Contribution } from "./useExtensionUi";

const noop = () => {};

const SEVERITIES = { info: 1, success: 1, warning: 1, error: 1 };

class PanelErrorBoundary extends Component<
  /** `resetKey`: a change clears a failure, so a new context gets a retry. */
  { fallback: ReactNode; children: ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Extension panel failed", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type ContributionPanelProps = {
  contribution: Contribution;
  /** The outlet context as JSON: pages pass it as an inline literal, so this keeps its identity stable. */
  contextKey: string;
  onDataChanged?: () => void;
};

function ContributionPanel({ contribution: c, contextKey, onDataChanged }: ContributionPanelProps) {
  // The cache, not this memo, keeps the identity: this component sits inside the Suspense
  // boundary, so its memo is discarded on every retry while the panel is still loading.
  const Panel = useMemo(
    () => getLazyExtensionPanel(c),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c.extension, c.entry, c.module]
  );
  const api = useMemo(() => createExtensionApi(), []);

  const notify = useCallback<PanelProps<unknown>["notify"]>((message, severity = "info") => {
    // severity comes from the remote: fall back to info for unknown values
    const show = Object.hasOwn(SEVERITIES, severity) ? toast[severity] : toast.info;
    show(message);
  }, []);
  const props = useMemo<PanelProps<unknown>>(
    () => ({
      context: JSON.parse(contextKey) as unknown,
      api,
      notify,
      onDataChanged: onDataChanged ?? noop,
    }),
    [contextKey, api, notify, onDataChanged]
  );

  return <Panel {...props} />;
}

type PanelHostProps = ContributionPanelProps & {
  /** Shown instead of the panel when it fails to load or render. */
  errorFallback: ReactNode;
};

/** Loads and renders one contribution: error boundary and spinner around the remote panel. */
export default function PanelHost({ errorFallback, ...panel }: PanelHostProps) {
  const { extension, entry, module } = panel.contribution;
  // Keyed by the contribution, not the context: a new context is a prop update, not a remount.
  return (
    <PanelErrorBoundary key={`${extension}|${entry}|${module}`} resetKey={panel.contextKey} fallback={errorFallback}>
      <Suspense fallback={<Loader2 className="animate-spin" size={16} />}>
        <ContributionPanel {...panel} />
      </Suspense>
    </PanelErrorBoundary>
  );
}
