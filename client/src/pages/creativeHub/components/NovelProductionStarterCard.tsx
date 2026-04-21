import { useEffect, useState } from "react";
import type { CreativeHubProductionStatus } from "@ai-novel/shared/types/creativeHub";
import { getNovelDetail, updateNovel } from "@/api/novel";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface NovelProductionStarterCardProps {
  currentNovelTitle?: string | null;
  currentNovelId?: string | null;
  productionStatus?: CreativeHubProductionStatus | null;
  onSubmit: (prompt: string) => void;
  onQuickAction?: (prompt: string) => void;
}

function fromNarrativePov(value: "first_person" | "third_person" | "mixed" | null | undefined): string {
  if (value === "first_person") return "Ngôi thứ nhất";
  if (value === "third_person") return "Ngôi thứ ba";
  if (value === "mixed") return "Góc nhìn hỗn hợp";
  return "";
}

function toNarrativePov(value: string): "first_person" | "third_person" | "mixed" | null {
  if (value === "Ngôi thứ nhất") return "first_person";
  if (value === "Ngôi thứ ba") return "third_person";
  if (value === "Góc nhìn hỗn hợp") return "mixed";
  return null;
}

function fromPacePreference(value: "slow" | "balanced" | "fast" | null | undefined): string {
  if (value === "slow") return "Nhịp chậm";
  if (value === "balanced") return "Nhịp cân bằng";
  if (value === "fast") return "Nhịp nhanh";
  return "";
}

function toPacePreference(value: string): "slow" | "balanced" | "fast" | null {
  if (value === "Nhịp chậm") return "slow";
  if (value === "Nhịp cân bằng") return "balanced";
  if (value === "Nhịp nhanh") return "fast";
  return null;
}

function fromProjectMode(value: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null | undefined): string {
  if (value === "ai_led") return "AI dẫn dắt";
  if (value === "co_pilot") return "Đồng sáng tác người - máy";
  if (value === "draft_mode") return "Ưu tiên bản nháp";
  if (value === "auto_pipeline") return "Dây chuyền tự động";
  return "";
}

function toProjectMode(value: string): "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null {
  if (value === "AI dẫn dắt") return "ai_led";
  if (value === "Đồng sáng tác người - máy") return "co_pilot";
  if (value === "Ưu tiên bản nháp") return "draft_mode";
  if (value === "Dây chuyền tự động") return "auto_pipeline";
  return null;
}

function fromLevel(value: "low" | "medium" | "high" | null | undefined): string {
  if (value === "low") return "Thấp";
  if (value === "medium") return "Trung bình";
  if (value === "high") return "Cao";
  return "";
}

function toLevel(value: string): "low" | "medium" | "high" | null {
  if (value === "Thấp") return "low";
  if (value === "Trung bình") return "medium";
  if (value === "Cao") return "high";
  return null;
}

function buildProductionPrompt(input: {
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
}) {
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
    const segments = [`Tiếp tục tạo tiểu thuyết hiện tại. Số chương mục tiêu: ${targetChapterCount}.`];
    if (description) {
      segments.push(`Thiết lập bổ sung: ${description}.`);
    }
    if (genre) {
      segments.push(`Ưu tiên thể loại: ${genre}.`);
    }
    if (styleTone) {
      segments.push(`Tông phong cách: ${styleTone}.`);
    }
    if (narrativePov) {
      segments.push(`Góc nhìn kể chuyện: ${narrativePov}.`);
    }
    if (pacePreference) {
      segments.push(`Nhịp triển khai: ${pacePreference}.`);
    }
    if (projectMode) {
      segments.push(`Chế độ cộng tác: ${projectMode}.`);
    }
    if (emotionIntensity) {
      segments.push(`Cường độ cảm xúc: ${emotionIntensity}.`);
    }
    if (aiFreedom) {
      segments.push(`Mức tự do của AI: ${aiFreedom}.`);
    }
    if (defaultChapterLength) {
      segments.push(`Độ dài chương mặc định: khoảng ${defaultChapterLength} chữ.`);
    }
    if (worldType) {
      segments.push(`Ưu tiên loại thế giới quan: ${worldType}.`);
    }
    return segments.join("");
  }
  const title = input.title.trim();
  const segments = [`Tạo một tiểu thuyết ${targetChapterCount} chương tên “${title}” và bắt đầu sản xuất toàn bộ cuốn sách.`];
  if (description) {
    segments.push(`Giới thiệu: ${description}.`);
  }
  if (genre) {
    segments.push(`Thể loại: ${genre}.`);
  }
  if (styleTone) {
    segments.push(`Tông phong cách: ${styleTone}.`);
  }
  if (narrativePov) {
    segments.push(`Góc nhìn kể chuyện: ${narrativePov}.`);
  }
  if (pacePreference) {
    segments.push(`Nhịp triển khai: ${pacePreference}.`);
  }
  if (projectMode) {
    segments.push(`Chế độ cộng tác: ${projectMode}.`);
  }
  if (emotionIntensity) {
    segments.push(`Cường độ cảm xúc: ${emotionIntensity}.`);
  }
  if (aiFreedom) {
    segments.push(`Mức tự do của AI: ${aiFreedom}.`);
  }
  if (defaultChapterLength) {
    segments.push(`Độ dài chương mặc định: khoảng ${defaultChapterLength} chữ.`);
  }
  if (worldType) {
    segments.push(`Loại thế giới quan: ${worldType}.`);
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
        setNarrativePov(fromNarrativePov(novel.narrativePov));
        setPacePreference(fromPacePreference(novel.pacePreference));
        setProjectMode(fromProjectMode(novel.projectMode));
        setEmotionIntensity(fromLevel(novel.emotionIntensity));
        setAiFreedom(fromLevel(novel.aiFreedom));
        setDefaultChapterLength(novel.defaultChapterLength ?? 2500);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentNovelId]);

  const resolvedTitle = currentNovelTitle?.trim() || "";
  const isContinueMode = Boolean(currentNovelId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 text-xs font-medium text-slate-500">Sản xuất toàn cuốn</div>
      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {isContinueMode
            ? `Hiện sẽ tiếp tục sản xuất “${resolvedTitle || "tiểu thuyết hiện tại"}”.`
            : "Hiện đang ở chế độ toàn cục, có thể tạo sách mới và khởi động sản xuất toàn cuốn ngay."}
        </div>
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
          Nên xác nhận trước: thể loại, phong cách, góc nhìn, nhịp điệu, độ dài chương và mức tự do của AI. Điều kiện càng đầy đủ, sai lệch khi sản xuất toàn cuốn càng thấp.
        </div>
        {!isContinueMode ? (
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Tiêu đề tiểu thuyết"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        ) : null}
        <textarea
          className="min-h-[88px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
          placeholder="Giới thiệu / thiết lập cốt lõi"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Loại thể loại, ví dụ: huyền huyễn phương Đông / đô thị huyền nghi"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Tông phong cách, ví dụ: lạnh lẽo, nặng nề / tươi sáng, nhiệt huyết"
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
            <option value="">Góc nhìn kể chuyện</option>
            <option value="Ngôi thứ nhất">Ngôi thứ nhất</option>
            <option value="Ngôi thứ ba">Ngôi thứ ba</option>
            <option value="Góc nhìn hỗn hợp">Góc nhìn hỗn hợp</option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={pacePreference}
            onChange={(event) => setPacePreference(event.target.value)}
          >
            <option value="">Nhịp triển khai</option>
            <option value="Nhịp chậm">Nhịp chậm</option>
            <option value="Nhịp cân bằng">Nhịp cân bằng</option>
            <option value="Nhịp nhanh">Nhịp nhanh</option>
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={projectMode}
            onChange={(event) => setProjectMode(event.target.value)}
          >
            <option value="">Chế độ cộng tác</option>
            <option value="AI dẫn dắt">AI dẫn dắt</option>
            <option value="Đồng sáng tác người - máy">Đồng sáng tác người - máy</option>
            <option value="Ưu tiên bản nháp">Ưu tiên bản nháp</option>
            <option value="Dây chuyền tự động">Dây chuyền tự động</option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={emotionIntensity}
            onChange={(event) => setEmotionIntensity(event.target.value)}
          >
            <option value="">Cường độ cảm xúc</option>
            <option value="Thấp">Thấp</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Cao">Cao</option>
          </select>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            value={aiFreedom}
            onChange={(event) => setAiFreedom(event.target.value)}
          >
            <option value="">Mức tự do của AI</option>
            <option value="Thấp">Thấp</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Cao">Cao</option>
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Số chương mục tiêu"
            type="number"
            min={1}
            max={200}
            value={targetChapterCount}
            onChange={(event) => setTargetChapterCount(Number(event.target.value || 20))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Độ dài chương mặc định (chữ)"
            type="number"
            min={500}
            max={10000}
            value={defaultChapterLength}
            onChange={(event) => setDefaultChapterLength(Number(event.target.value || 2500))}
          />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            placeholder="Loại thế giới quan tùy chọn"
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
                    ...(toNarrativePov(narrativePov) ? { narrativePov: toNarrativePov(narrativePov) } : {}),
                    ...(toPacePreference(pacePreference) ? { pacePreference: toPacePreference(pacePreference) } : {}),
                    ...(toProjectMode(projectMode) ? { projectMode: toProjectMode(projectMode) } : {}),
                    ...(toLevel(emotionIntensity) ? { emotionIntensity: toLevel(emotionIntensity) } : {}),
                    ...(toLevel(aiFreedom) ? { aiFreedom: toLevel(aiFreedom) } : {}),
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
                }));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Lưu điều kiện trước khi sản xuất thất bại.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Đang xử lý..." : isContinueMode ? "Tiếp tục sản xuất toàn cuốn" : "Bắt đầu sản xuất toàn cuốn"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onQuickAction?.("整本生成到哪一步了")}
          >
            Xem tiến độ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onQuickAction?.("为什么整本生成没有启动")}
            >
              Xem điểm chặn
            </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onQuickAction?.("基于当前小说信息，为生产前的题材、风格、视角、节奏、章长和 AI 自由度各给出 3 个备选答案。")}
          >
            Tạo phương án thay thế
          </Button>
        </div>
      </div>
    </div>
  );
}
