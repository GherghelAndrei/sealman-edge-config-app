import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ExtensionEnabledBadge({ enabled, className }: { enabled: boolean; className?: string }) {
  return enabled ? (
    <Badge
      variant="outline"
      className={cn("border-[#49cc90]/40 bg-[#49cc90]/15 text-[#2d8a5e] font-normal", className)}
    >
      enabled
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn("border-gray-300 bg-gray-100 text-gray-500 font-normal", className)}
    >
      disabled
    </Badge>
  );
}
