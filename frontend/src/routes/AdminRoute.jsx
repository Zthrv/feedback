import { Navigate, Outlet } from "react-router-dom";

import { useCurrentUser } from "@/hooks/use-current-user";

// Hides admin pages from others; the real check is requireRole on the server
function AdminRoute() {
  const user = useCurrentUser();

  return user?.role === "Admin" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default AdminRoute;
