import { useLocation } from "react-router-dom";
import LLMSelector from "@/components/common/LLMSelector";
import DesktopBrandMark from "@/components/layout/DesktopBrandMark";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAppLanguage, setAppLanguage, SUPPORTED_LANGUAGES, t, type AppLanguage } from "@/i18n";


interface NavbarProps {
  workspaceNavMode?: "workspace" | "project";
  onWorkspaceNavModeChange?: (mode: "workspace" | "project") => void;
}

export default function Navbar(props: NavbarProps) {
  const { workspaceNavMode, onWorkspaceNavModeChange } = props;
  const location = useLocation();
  const isHome = location.pathname === "/";
  const showWorkspaceToggle = Boolean(workspaceNavMode && onWorkspaceNavModeChange);
  const currentLanguage = getAppLanguage();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <DesktopBrandMark className="h-8 w-8 shrink-0 drop-shadow-none" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{t("AI 小说创作工作台")}</span>
          <span className="text-[11px] text-muted-foreground">{t("AI Novel Production Engine")}</span>
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
            {workspaceNavMode === "workspace" ? t("项目导航") : t("创作导航")}
          </Button>
        ) : null}
        <Select
          value={currentLanguage}
          onValueChange={(value) => {
            void setAppLanguage(value as AppLanguage);
          }}
        >
          <SelectTrigger className="h-9 w-[112px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LLMSelector compact showBadge={false} showHelperText={false} />
      </div>
    </header>
  );
}
