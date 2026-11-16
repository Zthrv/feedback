import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Lock, LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthService from "@/services/authService";
import { useCurrentUser } from "@/hooks/use-current-user";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProfileDropdown() {
  const navigate = useNavigate();

  const user = useCurrentUser();

  const name = user?.full_name || "Account";

  const handleSignOut = () => {
    AuthService.logout();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 outline-none hover:bg-slate-50">
        <Avatar size="default">
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>

        <span className="text-sm font-semibold text-slate-900">
          {name}
        </span>

        <ChevronDown className="text-slate-400" size={16} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-2">
        <DropdownMenuItem
          className="gap-2 py-2 font-medium text-brand-600"
          onClick={() => navigate("/create-feedback")}
        >
          <Plus size={16} />
          Create New Feedback
        </DropdownMenuItem>

        <DropdownMenuItem
          className="gap-2 py-2"
          onClick={() => navigate("/change-password")}
        >
          <Lock size={16} />
          Change Password
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="gap-2 py-2"
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ProfileDropdown;
