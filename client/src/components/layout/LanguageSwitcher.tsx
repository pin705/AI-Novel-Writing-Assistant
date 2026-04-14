import { Languages } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppLocale } from "@ai-novel/shared/types/appPreferences";
import { saveAppPreferences } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import {
  APP_LOCALE_OPTIONS,
  getDefaultAiOutputLanguageForLocale,
  useI18n,
} from "@/i18n";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getLocaleLabel(locale: AppLocale, t: ReturnType<typeof useI18n>["t"]): string {
  if (locale === "vi-VN") {
    return t("language.option.vi");
  }
  if (locale === "en-US") {
    return t("language.option.en");
  }
  return t("language.option.zh");
}

export default function LanguageSwitcher() {
  const queryClient = useQueryClient();
  const { preferences, setPreferences, t } = useI18n();

  const saveMutation = useMutation({
    mutationFn: saveAppPreferences,
  });

  const handleLocaleChange = (nextLocale: string) => {
    const normalizedLocale = APP_LOCALE_OPTIONS.find((item) => item === nextLocale);
    if (!normalizedLocale || normalizedLocale === preferences.uiLocale) {
      return;
    }

    const previous = preferences;
    const nextPreferences = {
      uiLocale: normalizedLocale,
      aiOutputLanguage: getDefaultAiOutputLanguageForLocale(normalizedLocale),
    };

    setPreferences(nextPreferences);
    saveMutation.mutate(nextPreferences, {
      onSuccess: (response) => {
        const resolved = response.data ?? nextPreferences;
        setPreferences(resolved);
        queryClient.setQueryData(queryKeys.settings.appPreferences, response);
        toast.success(t("language.saved"));
      },
      onError: (error) => {
        setPreferences(previous);
        toast.error(error instanceof Error ? error.message : t("language.saveFailed"));
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Select
        value={preferences.uiLocale}
        onValueChange={handleLocaleChange}
        disabled={saveMutation.isPending}
      >
        <SelectTrigger
          className="h-9 min-w-[148px]"
          aria-label={t("language.switcher.ariaLabel")}
          title={t("language.switcher.ariaLabel")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APP_LOCALE_OPTIONS.map((locale) => (
            <SelectItem key={locale} value={locale}>
              {getLocaleLabel(locale, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
