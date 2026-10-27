import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PATH_PARAM_RE = /\{([^}]+)\}/g;

export type PathPart =
  | { kind: "text"; text: string }
  | { kind: "brace"; text: "{" | "}" }
  | { kind: "name"; text: string };

interface ScopeFields {
  scoped: boolean;
  scope_in: "path" | "query";
  scope_param: string;
  path: string;
  query_params: { name: string }[];
}

export function pathParamNames(path: string): string[] {
  return Array.from(path.matchAll(PATH_PARAM_RE), (m) => m[1]);
}

export function scopeParamChoices(route: Pick<ScopeFields, "scope_in" | "path" | "query_params">): string[] {
  if (route.scope_in === "path") {
    return pathParamNames(route.path);
  }
  const names = route.query_params.map((p) => p.name.trim()).filter(Boolean);
  return Array.from(new Set(names));
}

/** Drop a scope_param that no longer exists on the path / query list. Does not keep
 * leftover DB values just because they were previously saved. */
export function coerceScopeParam<T extends ScopeFields>(route: T): T {
  if (!route.scoped) return route;
  const choices = scopeParamChoices(route);
  const current = route.scope_param.trim();
  if (current && choices.includes(current)) return route;
  const next = choices[0] ?? "";
  return next === route.scope_param ? route : { ...route, scope_param: next };
}

export function pathParts(path: string): PathPart[] {
  const parts: PathPart[] = [];
  let last = 0;
  const re = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    if (match.index > last) {
      parts.push({ kind: "text", text: path.slice(last, match.index) });
    }
    parts.push({ kind: "brace", text: "{" });
    if (match[1]) parts.push({ kind: "name", text: match[1] });
    parts.push({ kind: "brace", text: "}" });
    last = match.index + match[0].length;
  }
  if (last < path.length) {
    parts.push({ kind: "text", text: path.slice(last) });
  }
  return parts;
}

const BRACE_CLASS = "text-violet-600 dark:text-violet-400";
const NAME_CLASS = "text-sky-600 dark:text-sky-400";

export function HighlightedPath({ path, className }: { path: string; className?: string }) {
  return (
    <span className={cn("font-mono", className)}>
      {pathParts(path).map((part, i) => {
        if (part.kind === "brace") {
          return (
            <span key={i} className={BRACE_CLASS}>
              {part.text}
            </span>
          );
        }
        if (part.kind === "name") {
          return (
            <span key={i} className={NAME_CLASS}>
              {part.text}
            </span>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </span>
  );
}

export function PathHighlightInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  return (
    <div className="relative">
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre rounded-md px-3 font-mono text-base md:text-sm"
      >
        {value ? <HighlightedPath path={value} /> : null}
      </div>
      <Input
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (overlayRef.current) overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
        className={cn("font-mono", value ? "text-transparent caret-foreground" : undefined, className)}
      />
    </div>
  );
}
