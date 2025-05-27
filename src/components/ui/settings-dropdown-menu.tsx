import * as React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

const SettingsDropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Settings className="h-4 w-4" />
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
};

const SettingsDropdownMenuContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DropdownMenuContent>
      {children}
    </DropdownMenuContent>
  );
};

export { SettingsDropdownMenu, SettingsDropdownMenuContent };