import { useEffect, useState } from "react";
import type { CreativeHubProductionStatus } from "@ai-novel/shared/types/creativeHub";
import { getNovelDetail, updateNovel } from "@/api/novel";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";

type Translator = (key: string, values?: Record<string, string | number | undefined | null>) => string;

interface NovelProductionStarterCardProps {
  currentNovelTitle?: string | null;
  currentNovelId?: string | null;
  productionStatus?: CreativeHubProductionStatus | null;
  onSubmit: (prompt: string) => void;
  onQuickAction?: (prompt: string) => void;
}

function fromNarrativePov(value: "first_person" | "third_person" | "mixed" | null | undefined, t: Translator): string {
  if (value === "first_person") return t("creativeHub.productionStarter.narrativePov.firstPerson");
  if (value === "third_person") return t("creativeHub.productionStarter.narrativePov.thirdPerson");
  if (value === "mixed") return t("creativeHub.productionStarter.narrativePov.mixed");
  return "";
}

function toNarrativePov(value: string, t: Translator): "first_person" | "third_person" | "mixed" | null {
  if (value === t("creativeHub.productionStarter.narrativePov.firstPerson")) return "first_person";
  if (value === t("creativeHub.productionStarter.narrativePov.thirdPerson")) return "third_person";
  if (value === t("creativeHub.productionStarter.narrativePov.mixed")) return "mixed";
  return null;
}

function fromPacePreference(value: "slow" | "balanced" | "fast" | null | undefined, t: Translator): string {
  if (value === "slow") return t("creativeHub.productionStarter.pace.slow");
  if (value === "balanced") return t("creativeHub.productionStarter.pace.balanced");
  if (value === "fast") return t("creativeHub.productionStarter.pace.fast");
  return "";
}

function toPacePreference(value: string, t: Translator): "slow" | "balanced" | "fast" | null {
  if (value === t("creativeHub.productionStarter.pace.slow")) return "slow";
  if (value === t("creativeHub.productionStarter.pace.balanced")) return "balanced";
  if (value === t("creativeHub.productionStarter.pace.fast")) return "fast";
  return null;
}

function fromProjectMode(value: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null | undefined, t: Translator): string {
  if (value === "ai_led") return t("creativeHub.productionStarter.projectMode.aiLed");
  if (value === "co_pilot") return t("creativeHub.productionStarter.projectMode.coPilot");
  if (value === "draft_mode") return t("creativeHub.productionStarter.projectMode.draftMode");
  if (value === "auto_pipeline") return t("creativeHub.productionStarter.projectMode.autoPipeline");
  return "";
}

function toProjectMode(value: string, t: Translator): "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null {
  if (value === t("creativeHub.productionStarter.projectMode.aiLed")) return "ai_led";
  if (value === t("creativeHub.productionStarter.projectMode.coPilot")) return "co_pilot";
  if (value === t("creativeHub.productionStarter.projectMode.draftMode")) return "draft_mode";
  if (value === t("creativeHub.productionStarter.projectMode.autoPipeline")) return "auto_pipeline";
  return null;
}

function fromLevel(value: "low" | "medium" | "high" | null | undefined, t: Translator): string {
  if (value === "low") return t("creativeHub.productionStarter.level.low");
  if (value === "medium") return t("creativeHub.productionStarter.level.medium");
  if (value === "high") return t("creativeHub.productionStarter.level.high");
  return "";
}

function toLevel(value: string, t: Translator): "low" | "medium" | "high" | null {
  if (value === t("creativeHub.productionStarter.level.low")) return "low";
  if (value === t("creativeHub.productionStarter.level.medium")) return "medium";
  if (value === t("creativeHub.productionStarter.level.high")) return "high";
  return null;
}

function buildProductionPrompt(
  input: {
    currentNovelId?: string | null;
    title: string;
    description: string;
    targetChapterCount: number;
    genre: string;
    styleTone: string;
    narrativePov: string;
    pacePreference: string;
    projectMode: string;
    emotionIntensity: string;
    aiFreedom: string;
    defaultChapterLength: number;
    worldType: string;
  },
  t: Translator,
) {
  const description = input.description.trim();
  const genre = input.genre.trim();
  const styleTone = input.styleTone.trim();
  const narrativePov = input.narrativePov.trim();
  const pacePreference = input.pacePreference.trim();
  const projectMode = input.projectMode.trim();
  const emotionIntensity = input.emotionIntensity.trim();
  const aiFreedom = input.aiFreedom.trim();
  const defaultChapterLength = Math.max(500, Math.min(10000, Math.floor(input.defaultChapterLength || 2500)));
  const worldType = input.worldType.trim();
  const targetChapterCount = Math.max(1, Math.min(200, Math.floor(input.targetChapterCount || 20)));
  if (input.currentNovelId) {
    const segments = [t("creativeHub.productionStarter.prompt.continueHeader", { count: targetChapterCount })];
    if (description) {
      segments.push(t("creativeHub.productionStarter.prompt.description", { value: description }));
    }
    if (genre) {
      segments.push(t("creativeHub.productionStarter.prompt.genre", { value: genre }));
    }
    if (styleTone) {
      segments.push(t("creativeHub.productionStarter.prompt.styleTone", { value: styleTone }));
    }
    if (narrativePov) {
      segments.push(t("creativeHub.productionStarter.prompt.narrativePov", { value: narrativePov }));
    }
    if (pacePreference) {
      segments.push(t("creativeHub.productionStarter.prompt.pace", { value: pacePreference }));
    }
    if (projectMode) {
      segments.push(t("creativeHub.productionStarter.prompt.projectMode", { value: projectMode }));
    }
    if (emotionIntensity) {
      segments.push(t("creativeHub.productionStarter.prompt.emotionIntensity", { value: emotionIntensity }));
    }
    if (aiFreedom) {
      segments.push(t("creativeHub.productionStarter.prompt.aiFreedom", { value: aiFreedom }));
    }
    if (defaultChapterLength) {
      segments.push(t("creativeHub.productionStarter.prompt.chapterLength", { value: defaultChapterLength }));
    }
    if (worldType) {
      segments.push(t("creativeHub.productionStarter.prompt.worldType", { value: worldType }));
    }
    return segments.join("");
  }
  const title = input.title.trim();
  const segments = [t("creativeHub.productionStarter.prompt.createHeader", { count: targetChapterCount, title })];
  if (description) {
    segments.push(t("creativeHub.productionStarter.prompt.descriptionCreate", { value: description }));
  }
  if (genre) {
    segments.push(t("creativeHub.productionStarter.prompt.genreCreate", { value: genre }));
  }
  if (styleTone) {
    segments.push(t("creativeHub.productionStarter.prompt.styleTone", { value: styleTone }));
  }
  if (narrativePov) {
    segments.push(t("creativeHub.productionStarter.prompt.narrativePov", { value: narrativePov }));
  }
  if (pacePreference) {
    segments.push(t("creativeHub.productionStarter.prompt.pace", { value: pacePreference }));
  }
  if (projectMode) {
    segments.push(t("creativeHub.productionStarter.prompt.projectMode", { value: projectMode }));
  }
  if (emotionIntensity) {
    segments.push(t("creativeHub.productionStarter.prompt.emotionIntensity", { value: emotionIntensity }));
  }
  if (aiFreedom) {
    segments.push(t("creativeHub.productionStarter.prompt.aiFreedom", { value: aiFreedom }));
  }
  if (defaultChapterLength) {
    segments.push(t("creativeHub.productionStarter.prompt.chapterLength", { value: defaultChapterLength }));
  }
  if (worldType) {
    segments.push(t("creativeHub.productionStarter.prompt.worldTypeCreate", { value: worldType }));
  }
  return segments.join("");
}

export default function NovelProductionStarterCard({
  currentNovelTitle,
  currentNovelId,
  productionStatus,
  onSubmit,
  onQuickAction,
}: NovelProductionStarterCardProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetChapterCount, setTargetChapterCount] = useState(20);
  const [genre, setGenre] = useState("");
  const [styleTone, setStyleTone] = useState("");
  const [narrativePov, setNarrativePov] = useState("");
  const [pacePreference, setPacePreference] = useState("");
  const [projectMode, setProjectMode] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState("");
  const [aiFreedom, setAiFreedom] = useState("");
  const [defaultChapterLength, setDefaultChapterLength] = useState(2500);
  const [worldType, setWorldType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productionStatus?.targetChapterCount) {
      setTargetChapterCount(productionStatus.targetChapterCount);
    }
  }, [productionStatus?.targetChapterCount]);

  useEffect(() => {
    let cancelled = false;
    if (!currentNovelId) {
      return () => {
        cancelled = true;
      };
    }
    void getNovelDetail(currentNovelId)
      .then((response) => {
        if (cancelled) {
          return;
        }
        const novel = response.data;
        if (!novel) {
          return;
        }
        setDescription(novel.description ?? "");
        setGenre(novel.genre?.name ?? "");
        setStyleTone(novel.styleTone ?? "");
        setNarrativePov(fromNarrativePov(novel.narrativePov, t));
        setPacePreference(fromPacePreference(novel.pacePreference, t));
        setProjectMode(fromProjectMode(novel.projectMode, t));
        setEmotionIntensity(fromLevel(novel.emotionIntensity, t));
        setAiFreedom(fromLevel(novel.aiFreedom, t));
        setDefaultChapterLength(novel.defaultChapterLength ?? 2500);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentNovelId, t]);

  const resolvedTitle = currentNovelTitle?.trim() || "";
  const isContinueMode = Boolean(currentNovelId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-medium text-slate-500">{t("creativeHub.productionStarter.title")}</div>
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {isContinueMode
            ? t("creativeHub.productionStarter.currentNovelContinue", {
              title: resolvedTitle || t("creativeHub.productionStarter.currentNovelFallback"),
            })
            : t("creativeHub.productionStarter.globalMode")}
        </div>
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
          {t("creativeHub.productionStarter.hint")}
        </div>
        {!isContinueMode ? (
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder={t("creativeHub.productionStarter.novelTitlePlaceholder")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        ) : null}
        <textarea
          className="min-h-[88px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder={t("creativeHub.productionStarter.descriptionPlaceholder")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder={t("creativeHub.productionStarter.genrePlaceholder")}
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder={t("creativeHub.productionStarter.styleTonePlaceholder")}
            value={styleTone}
            onChange={(event) => setStyleTone(event.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={narrativePov}
            onChange={(event) => setNarrativePov(event.target.value)}
          >
            <option value="">{t("creativeHub.productionStarter.narrativePovPlaceholder")}</option>
            <option value={t("creativeHub.productionStarter.narrativePov.firstPerson")}>
              {t("creativeHub.productionStarter.narrativePov.firstPerson")}
            </option>
            <option value={t("creativeHub.productionStarter.narrativePov.thirdPerson")}>
              {t("creativeHub.productionStarter.narrativePov.thirdPerson")}
            </option>
            <option value={t("creativeHub.productionStarter.narrativePov.mixed")}>
              {t("creativeHub.productionStarter.narrativePov.mixed")}
            </option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={pacePreference}
            onChange={(event) => setPacePreference(event.target.value)}
          >
            <option value="">{t("creativeHub.productionStarter.pacePlaceholder")}</option>
            <option value={t("creativeHub.productionStarter.pace.slow")}>
              {t("creativeHub.productionStarter.pace.slow")}
            </option>
            <option value={t("creativeHub.productionStarter.pace.balanced")}>
              {t("creativeHub.productionStarter.pace.balanced")}
            </option>
            <option value={t("creativeHub.productionStarter.pace.fast")}>
              {t("creativeHub.productionStarter.pace.fast")}
            </option>
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={projectMode}
            onChange={(event) => setProjectMode(event.target.value)}
          >
            <option value="">{t("creativeHub.productionStarter.projectModePlaceholder")}</option>
            <option value={t("creativeHub.productionStarter.projectMode.aiLed")}>
              {t("creativeHub.productionStarter.projectMode.aiLed")}
            </option>
            <option value={t("creativeHub.productionStarter.projectMode.coPilot")}>
              {t("creativeHub.productionStarter.projectMode.coPilot")}
            </option>
            <option value={t("creativeHub.productionStarter.projectMode.draftMode")}>
              {t("creativeHub.productionStarter.projectMode.draftMode")}
            </option>
            <option value={t("creativeHub.productionStarter.projectMode.autoPipeline")}>
              {t("creativeHub.productionStarter.projectMode.autoPipeline")}
            </option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={emotionIntensity}
            onChange={(event) => setEmotionIntensity(event.target.value)}
          >
            <option value="">{t("creativeHub.productionStarter.emotionPlaceholder")}</option>
            <option value={t("creativeHub.productionStarter.level.low")}>
              {t("creativeHub.productionStarter.level.low")}
            </option>
            <option value={t("creativeHub.productionStarter.level.medium")}>
              {t("creativeHub.productionStarter.level.medium")}
            </option>
            <option value={t("creativeHub.productionStarter.level.high")}>
              {t("creativeHub.productionStarter.level.high")}
            </option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={aiFreedom}
            onChange={(event) => setAiFreedom(event.target.value)}
          >
            <option value="">{t("creativeHub.productionStarter.aiFreedomPlaceholder")}</option>
            <option value={t("creativeHub.productionStarter.level.low")}>
              {t("creativeHub.productionStarter.level.low")}
            </option>
            <option value={t("creativeHub.productionStarter.level.medium")}>
              {t("creativeHub.productionStarter.level.medium")}
            </option>
            <option value={t("creativeHub.productionStarter.level.high")}>
              {t("creativeHub.productionStarter.level.high")}
            </option>
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder={t("creativeHub.productionStarter.targetChapterPlaceholder")}
            type="number"
            min={1}
            max={200}
            value={targetChapterCount}
            onChange={(event) => setTargetChapterCount(Number(event.target.value || 20))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder={t("creativeHub.productionStarter.defaultChapterLengthPlaceholder")}
            type="number"
            min={500}
            max={10000}
            value={defaultChapterLength}
            onChange={(event) => setDefaultChapterLength(Number(event.target.value || 2500))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder={t("creativeHub.productionStarter.worldTypePlaceholder")}
            value={worldType}
            onChange={(event) => setWorldType(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              if (!isContinueMode && !title.trim()) {
                return;
              }
              setIsSubmitting(true);
              try {
                if (currentNovelId) {
                  await updateNovel(currentNovelId, {
                    ...(description.trim() ? { description: description.trim() } : {}),
                    ...(styleTone.trim() ? { styleTone: styleTone.trim() } : {}),
                    ...(toNarrativePov(narrativePov, t) ? { narrativePov: toNarrativePov(narrativePov, t) } : {}),
                    ...(toPacePreference(pacePreference, t) ? { pacePreference: toPacePreference(pacePreference, t) } : {}),
                    ...(toProjectMode(projectMode, t) ? { projectMode: toProjectMode(projectMode, t) } : {}),
                    ...(toLevel(emotionIntensity, t) ? { emotionIntensity: toLevel(emotionIntensity, t) } : {}),
                    ...(toLevel(aiFreedom, t) ? { aiFreedom: toLevel(aiFreedom, t) } : {}),
                    ...(defaultChapterLength ? { defaultChapterLength: Math.max(500, Math.min(10000, defaultChapterLength)) } : {}),
                  });
                }
                onSubmit(buildProductionPrompt({
                  currentNovelId,
                  title,
                  description,
                  targetChapterCount,
                  genre,
                  styleTone,
                  narrativePov,
                  pacePreference,
                  projectMode,
                  emotionIntensity,
                  aiFreedom,
                  defaultChapterLength,
                  worldType,
                }, t));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : t("creativeHub.page.errors.savePreflightFailed"));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting
              ? t("creativeHub.productionStarter.submitting")
              : isContinueMode
                ? t("creativeHub.productionStarter.submitContinue")
                : t("creativeHub.productionStarter.submitStart")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onQuickAction?.(t("creativeHub.productionStarter.viewProgressPrompt"))}
          >
            {t("creativeHub.productionStarter.viewProgress")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onQuickAction?.(t("creativeHub.productionStarter.viewBlockersPrompt"))}
          >
            {t("creativeHub.productionStarter.viewBlockers")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onQuickAction?.(t("creativeHub.productionStarter.generateAlternativesPrompt"))}
          >
            {t("creativeHub.productionStarter.generateAlternatives")}
          </Button>
        </div>
      </div>
    </div>
  );
}
