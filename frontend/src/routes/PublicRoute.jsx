import { useSyncExternalStore } from "react";
import { Navigate, Outlet } from "react-router-dom";

import session from "@/services/session";

/**
 * Logged-in users skip the login pages and go straight to the dashboard
 */
function PublicRoute() {
  const token = useSyncExternalStore(session.subscribe, session.getToken);

  return token ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default PublicRoute;
