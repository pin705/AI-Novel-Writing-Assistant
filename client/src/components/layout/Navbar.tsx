import { PenSquare } from "lucide-react";
import { useLocation } from "react-router-dom";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  workspaceNavMode?: "workspace" | "project";
  onWorkspaceNavModeChange?: (mode: "workspace" | "project") => void;
}

export default function Navbar(props: NavbarProps) {
  const { workspaceNavMode, onWorkspaceNavModeChange } = props;
  const location = useLocation();
  const isHome = location.pathname === "/";
  const showWorkspaceToggle = Boolean(workspaceNavMode && onWorkspaceNavModeChange);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <PenSquare className="h-5 w-5" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Không gian sáng tác tiểu thuyết AI</span>
          <span className="text-[11px] text-muted-foreground">Hệ thống sản xuất tiểu thuyết bằng AI</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isHome && showWorkspaceToggle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onWorkspaceNavModeChange?.(workspaceNavMode === "workspace" ? "project" : "workspace")}
          >
            {workspaceNavMode === "workspace" ? "Điều hướng dự án" : "Điều hướng sáng tác"}
          </Button>
        ) : null}
        <LLMSelector compact showBadge={false} showHelperText={false} />
      </div>
    </header>
  );
}
