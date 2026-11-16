import { useSyncExternalStore } from "react";
import { Navigate, Outlet } from "react-router-dom";

import session from "@/services/session";

/**
 * Only logged-in users can see the nested routes
 */
function ProtectedRoute() {
  const token = useSyncExternalStore(session.subscribe, session.getToken);

  return token ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;
