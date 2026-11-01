import { useAuth } from "@/auth";
import type { BaseContext } from "./sdk";

/** The signed-in user as extension panels see it in `context.user`. */
export function useOutletUser(): BaseContext["user"] {
  const { user } = useAuth();
  return { id: user?.sub ?? "", name: user?.name ?? user?.preferred_username ?? "" };
}
