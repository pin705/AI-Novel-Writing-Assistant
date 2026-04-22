import { parseCommercialTagsJson } from "@ai-novel/shared/types/novelFraming";
import { getBackendLanguage } from "../../i18n";

interface BookFramingSource {
  targetAudience?: string | null;
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
  commercialTags?: string[] | null;
  commercialTagsJson?: string | null;
}

export function resolveCommercialTags(source: BookFramingSource): string[] {
  if (Array.isArray(source.commercialTags)) {
    return source.commercialTags.filter((item) => typeof item === "string" && item.trim().length > 0);
  }
  return parseCommercialTagsJson(source.commercialTagsJson);
}

export function buildBookFramingSummary(source: BookFramingSource): string {
  const commercialTags = resolveCommercialTags(source);
  const language = getBackendLanguage();
  const labels = language === "en"
    ? {
        audience: "Target audience",
        tags: "Core commercial tags",
        sellingPoint: "Core selling point",
        compFeel: "Comp feel / familiar reading vibe",
        first30: "First 30 chapters promise",
        joiner: ", ",
      }
    : language === "zh"
      ? {
          audience: "目标读者",
          tags: "核心商业标签",
          sellingPoint: "本书核心卖点",
          compFeel: "竞品感 / 熟悉阅读感",
          first30: "前 30 章承诺",
          joiner: "、",
        }
      : {
          audience: "Độc giả mục tiêu",
          tags: "Thẻ thương mại cốt lõi",
          sellingPoint: "Điểm bán cốt lõi",
          compFeel: "Cảm giác cạnh tranh / cảm giác đọc quen thuộc",
          first30: "Cam kết 30 chương đầu",
          joiner: ", ",
        };
  return [
    source.targetAudience?.trim() ? `${labels.audience}: ${source.targetAudience.trim()}` : "",
    commercialTags.length > 0 ? `${labels.tags}: ${commercialTags.join(labels.joiner)}` : "",
    source.bookSellingPoint?.trim() ? `${labels.sellingPoint}: ${source.bookSellingPoint.trim()}` : "",
    source.competingFeel?.trim() ? `${labels.compFeel}: ${source.competingFeel.trim()}` : "",
    source.first30ChapterPromise?.trim() ? `${labels.first30}: ${source.first30ChapterPromise.trim()}` : "",
  ].filter(Boolean).join("\n");
}
