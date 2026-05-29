import type { ComponentProps } from "react";
import type { CreativeHubResourceBinding } from "@ai-novel/shared/types/creativeHub";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { buildCreativeHubPath } from "@/lib/creativeHubLinks";

interface OpenInCreativeHubButtonProps {
  bindings: CreativeHubResourceBinding;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
}

export default function OpenInCreativeHubButton({
  bindings,
  label,
  variant = "outline",
  size = "sm",
  className,
}: OpenInCreativeHubButtonProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("components.creativeHub.openButton");
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to={buildCreativeHubPath(bindings)}>{resolvedLabel}</Link>
    </Button>
  );
}
