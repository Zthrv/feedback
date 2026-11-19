import {
  Flag,
  Hourglass,
  LayoutDashboard,
  MessageSquarePlus,
  MessagesSquare,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";

// Items without `roles` are shown to everyone
export const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Feedback", url: "/feedback", icon: MessagesSquare },
  { title: "Create Feedback", url: "/create-feedback", icon: MessageSquarePlus },
  { title: "Add Account", url: "/admin/users", icon: UserPlus, roles: ["Admin"] },
  { title: "All Feedback", url: "/admin/feedback", icon: Users, roles: ["Admin"] },
  { title: "Irrelevant Reports", url: "/admin/irrelevant-reports", icon: Flag, roles: ["Admin"] },
  { title: "Not Classified by LLM", url: "/admin/unclassified", icon: Hourglass, roles: ["Admin"] },
  { title: "Abusive", url: "/admin/abuse", icon: ShieldAlert, roles: ["Admin"] },
];

export function canSeeNavItem(item, user) {
  return !item.roles || item.roles.includes(user?.role);
}

// Pages reached from the profile menu rather than the sidebar
export const pageTitles = {
  "/change-password": "Change Password",
};

export function isNavItemActive(item, pathname) {
  return pathname === item.url || pathname.startsWith(`${item.url}/`);
}
