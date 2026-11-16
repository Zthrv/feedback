import { useSyncExternalStore } from "react";

import session from "@/services/session";

/**
 * Logged-in user, kept in sync with login, logout and profile updates
 */
export function useCurrentUser() {
  const raw = useSyncExternalStore(session.subscribe, session.getUserRaw);

  return raw ? JSON.parse(raw) : null;
}
