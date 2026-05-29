import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LOCALE_METADATA, SUPPORTED_LOCALES, type SupportedLocale } from "./config";
import { useI18n } from "./I18nProvider";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as SupportedLocale)}>
      <SelectTrigger
        aria-label={t("languageSwitcher.ariaLabel")}
        className={cn(
          "h-9 gap-2 rounded-lg border-border/70 bg-background px-2.5 text-xs",
          compact ? "w-[140px]" : "w-[180px]",
          className,
        )}
      >
        <Languages className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <SelectValue placeholder={t("languageSwitcher.label")} />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_METADATA[code].nativeLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
