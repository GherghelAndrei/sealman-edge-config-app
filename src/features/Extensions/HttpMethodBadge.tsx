import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Swagger/OpenAPI method hues, washed down so the fill is light and the text/border
 * still read as the same color. */
export const HTTP_METHOD_CLASS: Record<string, string> = {
  GET: "border-[#61affe]/40 bg-[#61affe]/15 text-[#2b6cb0]",
  POST: "border-[#49cc90]/40 bg-[#49cc90]/15 text-[#2d8a5e]",
  PUT: "border-[#fca130]/40 bg-[#fca130]/15 text-[#c56a12]",
  PATCH: "border-[#50e3c2]/40 bg-[#50e3c2]/15 text-[#1f8a74]",
  DELETE: "border-[#f93e3e]/40 bg-[#f93e3e]/15 text-[#c02525]",
  HEAD: "border-[#9012fe]/40 bg-[#9012fe]/15 text-[#6b21a8]",
  OPTIONS: "border-[#0d5aa7]/40 bg-[#0d5aa7]/15 text-[#0d5aa7]",
};

export function httpMethodClass(method: string): string {
  return HTTP_METHOD_CLASS[method.trim().toUpperCase()] ?? "text-muted-foreground";
}

export function HttpMethodBadge({ method, className }: { method: string; className?: string }) {
  const key = method.trim().toUpperCase();
  return (
    <Badge
      variant="outline"
      className={cn("font-mono font-semibold", httpMethodClass(key), className)}
    >
      {key || method}
    </Badge>
  );
}
