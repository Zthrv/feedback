import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "@/pages/Login/Login";
import ForgotPassword from "@/pages/Login/ForgotPassword";
import ResetPassword from "@/pages/Login/ResetPassword";
import Dashboard from "@/pages/Dashboard/Dashboard";
import CreateFeedback from "@/pages/Createfeedback/CreateFeedback";
import ViewFeedback from "@/pages/ViewFeedback/ViewFeedback";
import ChangePassword from "@/pages/Profile/ChangePassword";
import NotFound from "@/pages/NotFound/NotFound";
import MainLayout from "@/layouts/MainLayout";
import CreateUser from "@/pages/Admin/CreateUser";
import IrrelevantReports from "@/pages/Admin/IrrelevantReports";
import AllFeedback from "@/pages/Admin/AllFeedback";
import AbuseLog from "@/pages/Admin/AbuseLog";
import Unclassified from "@/pages/Admin/Unclassified";

import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import PublicRoute from "./PublicRoute";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Logged in */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-feedback" element={<CreateFeedback />} />
            <Route path="/feedback" element={<ViewFeedback />} />
            <Route path="/feedback/:attributeId" element={<ViewFeedback />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Admin only */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<CreateUser />} />
              <Route path="/admin/irrelevant-reports" element={<IrrelevantReports />} />
              <Route path="/admin/unclassified" element={<Unclassified />} />
              <Route path="/admin/feedback" element={<AllFeedback />} />
              <Route path="/admin/abuse" element={<AbuseLog />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
