import type { Character } from "@ai-novel/shared/types/novel";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { getCastRoleLabel, getCharacterGenderLabel, isProtagonistCharacter } from "./characterAssetWorkspace.helpers";

interface CharacterFocusSummaryProps {
  selectedCharacter: Character;
  lastAppearanceChapter?: number | null;
}

export default function CharacterFocusSummary(props: CharacterFocusSummaryProps) {
  const { selectedCharacter, lastAppearanceChapter } = props;
  const { t } = useTranslation();
  const isProtagonist = isProtagonistCharacter(selectedCharacter);
  const focusTitle = isProtagonist
    ? t("novels.characterFocus.currentProtagonist", { name: selectedCharacter.name })
    : t("novels.characterFocus.currentRole", { name: selectedCharacter.name });
  const primaryLine = isProtagonist
    ? selectedCharacter.currentGoal || selectedCharacter.storyFunction || t("novels.characterFocus.currentGoalPending")
    : selectedCharacter.relationToProtagonist || selectedCharacter.role || t("novels.characterFocus.relationPending");

  return (
    <div className={`rounded-xl border p-4 ${isProtagonist ? "border-primary/30 bg-primary/5" : "bg-muted/10"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold">{focusTitle}</div>
            {isProtagonist ? (
              <Badge variant="secondary">{t("novels.characterFocus.protagonistBadge")}</Badge>
            ) : (
              <Badge variant="outline">{getCastRoleLabel(selectedCharacter.castRole)}</Badge>
            )}
            <Badge variant="secondary">{getCharacterGenderLabel(selectedCharacter.gender)}</Badge>
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            {isProtagonist
              ? t("novels.characterFocus.currentGoal", { value: primaryLine })
              : t("novels.characterFocus.relationToProtagonist", { value: primaryLine })}
          </div>
        </div>
        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:min-w-[320px]">
          <div>{t("novels.characterFocus.identity", { value: selectedCharacter.role || t("novels.characterFocus.identityUndefined") })}</div>
          <div>
            {t("novels.characterFocus.lastAppearance", {
              value: lastAppearanceChapter
                ? t("novels.characterFocus.lastAppearanceChapter", { order: lastAppearanceChapter })
                : t("novels.characterFocus.lastAppearanceNone"),
            })}
          </div>
          <div>{t("novels.characterFocus.storyFunction", { value: selectedCharacter.storyFunction || t("novels.characterFocus.valuePending") })}</div>
          <div>{t("novels.characterFocus.currentState", { value: selectedCharacter.currentState || t("novels.characterFocus.valuePending") })}</div>
        </div>
      </div>
    </div>
  );
}
