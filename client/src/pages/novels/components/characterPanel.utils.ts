import type { Character, CharacterTimeline } from "@ai-novel/shared/types/novel";
import { t } from "@/i18n";


const RELATION_POSITIVE_KEYWORDS = [t("伙伴"), t("盟友"), t("信任"), t("守护"), t("亲密"), t("喜欢"), t("合作")];
const RELATION_NEGATIVE_KEYWORDS = [t("敌对"), t("对立"), t("怀疑"), t("背叛"), t("利用"), t("冲突"), t("压制")];
const TREND_UP_KEYWORDS = [t("升温"), t("缓和"), t("靠近"), t("修复"), t("合作加深"), t("信任增加")];
const TREND_DOWN_KEYWORDS = [t("恶化"), t("破裂"), t("紧张"), t("决裂"), t("冲突升级"), t("敌意加深")];

function compactText(input: string | null | undefined): string {
  return (input ?? "").trim();
}

function joinSegments(segments: Array<string | null | undefined>): string {
  return segments
    .map((segment) => compactText(segment))
    .filter((segment) => segment.length > 0)
    .join("；");
}

function countHits(source: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => (source.includes(keyword) ? count + 1 : count), 0);
}

export interface QuickCharacterCreatePayload {
  name: string;
  role: string;
  relationToProtagonist?: string;
  storyFunction?: string;
  keywords?: string;
  autoGenerateProfile?: boolean;
}

export interface CharacterRelationRow {
  targetCharacterId: string;
  targetCharacterName: string;
  currentRelation: string;
  trend: string;
  lastChangedChapter: number | null;
  evidence: string;
}

interface GeneratedCharacterProfile {
  personality?: string;
  background?: string;
  development?: string;
  currentState?: string;
  currentGoal?: string;
}

export function buildCharacterProfileFromWizard(payload: QuickCharacterCreatePayload): GeneratedCharacterProfile {
  if (!payload.autoGenerateProfile) {
    return {};
  }

  const keywordList = (payload.keywords ?? "")
    .split(/[，,\s]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const keywordText = keywordList.length > 0 ? keywordList.join("、") : t("待补充");

  const personality = t("核心特征：{{keywordText}}", { keywordText: keywordText });
  const background = joinSegments([
    payload.relationToProtagonist ? t("与主角关系：{{relationToProtagonist}}", { relationToProtagonist: payload.relationToProtagonist }) : "",
    payload.storyFunction ? t("故事作用：{{storyFunction}}", { storyFunction: payload.storyFunction }) : "",
  ]);
  const development = joinSegments([
    payload.storyFunction ? t("角色成长主轴：围绕“{{storyFunction}}”推进。", { storyFunction: payload.storyFunction }) : "",
    keywordList.length > 0 ? t("潜在冲突点：{{value}}", { value: keywordList.slice(0, 3).join("、") }) : "",
    keywordList.length > 0 ? t("可埋伏笔点：{{value}}", { value: keywordList.slice(-2).join("、") }) : "",
    keywordList.length > 0 ? t("说话风格建议：偏向{{keywordList}}语气。", { keywordList: keywordList[0] }) : "",
  ]);

  return {
    personality: personality || undefined,
    background: background || undefined,
    development: development || undefined,
    currentState: payload.relationToProtagonist ? t("关系推进中（{{relationToProtagonist}}）", { relationToProtagonist: payload.relationToProtagonist }) : t("待上场"),
    currentGoal: payload.storyFunction || t("推动主线关键节点"),
  };
}

function inferCurrentRelation(source: string): string {
  if (!source) {
    return t("待定义");
  }
  const positiveHits = countHits(source, RELATION_POSITIVE_KEYWORDS);
  const negativeHits = countHits(source, RELATION_NEGATIVE_KEYWORDS);
  if (positiveHits > negativeHits) {
    return t("合作 / 亲近");
  }
  if (negativeHits > positiveHits) {
    return t("对立 / 紧张");
  }
  return t("复杂 / 待观察");
}

function inferTrend(source: string): string {
  if (!source) {
    return t("待观察");
  }
  const upHits = countHits(source, TREND_UP_KEYWORDS);
  const downHits = countHits(source, TREND_DOWN_KEYWORDS);
  if (upHits > downHits) {
    return t("升温");
  }
  if (downHits > upHits) {
    return t("恶化");
  }
  return t("平稳");
}

function includesCharacterName(source: string, characterName: string): boolean {
  if (!source || !characterName) {
    return false;
  }
  return source.includes(characterName);
}

function buildLatestEvidence(event?: CharacterTimeline): string {
  if (!event) {
    return t("暂无章节证据");
  }
  const excerpt = compactText(event.content).slice(0, 36);
  return excerpt.length > 0 ? excerpt : event.title;
}

export function buildCharacterRelationRows(
  selectedCharacter: Character | undefined,
  characters: Character[],
  timelineEvents: CharacterTimeline[],
): CharacterRelationRow[] {
  if (!selectedCharacter) {
    return [];
  }

  const selectedText = joinSegments([
    selectedCharacter.background,
    selectedCharacter.development,
    selectedCharacter.currentState,
    selectedCharacter.currentGoal,
    selectedCharacter.personality,
  ]);

  return characters
    .filter((character) => character.id !== selectedCharacter.id)
    .map((character) => {
      const relatedEvents = timelineEvents
        .filter((event) => includesCharacterName(`${event.title} ${event.content}`, character.name))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latestEvent = relatedEvents[0];
      const relationSource = joinSegments([
        selectedText,
        ...relatedEvents.slice(0, 3).map((event) => `${event.title} ${event.content}`),
      ]);

      return {
        targetCharacterId: character.id,
        targetCharacterName: character.name,
        currentRelation: inferCurrentRelation(relationSource),
        trend: inferTrend(relationSource),
        lastChangedChapter: latestEvent?.chapterOrder ?? null,
        evidence: buildLatestEvidence(latestEvent),
      };
    });
}

export function getLastAppearanceChapter(timelineEvents: CharacterTimeline[]): number | null {
  return timelineEvents.reduce<number | null>((latest, event) => {
    if (typeof event.chapterOrder !== "number") {
      return latest;
    }
    if (latest === null || event.chapterOrder > latest) {
      return event.chapterOrder;
    }
    return latest;
  }, null);
}
