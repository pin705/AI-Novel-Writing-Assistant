import { useLocation } from "react-router-dom";
import LLMSelector from "@/components/common/LLMSelector";
import DesktopBrandMark from "@/components/layout/DesktopBrandMark";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useTranslation } from "@/i18n";
import {
  AUTO_DIRECTOR_MOBILE_CLASSES,
  shouldUseAutoDirectorMobileFullWidthContent,
} from "@/mobile/autoDirector";

interface NavbarProps {
  workspaceNavMode?: "workspace" | "project";
  onWorkspaceNavModeChange?: (mode: "workspace" | "project") => void;
}

export default function Navbar(props: NavbarProps) {
  const { workspaceNavMode, onWorkspaceNavModeChange } = props;
  const location = useLocation();
  const { t } = useTranslation();
  const isHome = location.pathname === "/";
  const showWorkspaceToggle = Boolean(workspaceNavMode && onWorkspaceNavModeChange);
  const useMobileAutoDirectorShell = shouldUseAutoDirectorMobileFullWidthContent(location.pathname);

  return (
    <header className="flex h-16 min-w-0 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <DesktopBrandMark className="h-8 w-8 shrink-0 drop-shadow-none" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{t("app.title")}</span>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{t("app.tagline")}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {!isHome && showWorkspaceToggle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={useMobileAutoDirectorShell ? AUTO_DIRECTOR_MOBILE_CLASSES.navbarWorkspaceToggle : undefined}
            onClick={() => onWorkspaceNavModeChange?.(workspaceNavMode === "workspace" ? "project" : "workspace")}
          >
            {workspaceNavMode === "workspace" ? t("navbar.toggleToProjectNav") : t("navbar.toggleToWorkspaceNav")}
          </Button>
        ) : null}
        <LanguageSwitcher compact />
        <div className={useMobileAutoDirectorShell ? AUTO_DIRECTOR_MOBILE_CLASSES.navbarModelSelector : undefined}>
          <LLMSelector compact showBadge={false} showHelperText={false} />
        </div>
      </div>
    </header>
  );
}
