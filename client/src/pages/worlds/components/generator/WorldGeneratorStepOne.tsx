import type { WorldOptionRefinementLevel, WorldReferenceAnchor, WorldReferenceMode } from "@ai-novel/shared/types/worldWizard";
import { Button } from "@/components/ui/button";
import KnowledgeDocumentPicker from "@/components/knowledge/KnowledgeDocumentPicker";
import type {
  GeneratorGenreOption,
  InspirationMode,
  WorldGeneratorConceptCard,
} from "./worldGeneratorShared";
import { REFERENCE_MODE_OPTIONS } from "./worldGeneratorShared";

interface WorldGeneratorStepOneProps {
  worldName: string;
  selectedGenreId: string;
  selectedGenre: GeneratorGenreOption | null;
  genreOptions: GeneratorGenreOption[];
  genreLoading: boolean;
  inspirationMode: InspirationMode;
  referenceMode: WorldReferenceMode;
  selectedKnowledgeDocumentIds: string[];
  preserveText: string;
  allowedChangesText: string;
  forbiddenText: string;
  inspirationText: string;
  optionRefinementLevel: WorldOptionRefinementLevel;
  optionsCount: number;
  canAnalyze: boolean;
  analyzeStreaming: boolean;
  analyzeButtonLabel: string;
  analyzeProgressMessage?: string;
  inspirationSourceMeta: {
    extracted: boolean;
    originalLength: number;
    chunkCount: number;
  } | null;
  concept: WorldGeneratorConceptCard | null;
  propertyOptionsCount: number;
  referenceAnchors: WorldReferenceAnchor[];
  onWorldNameChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onOpenGenreManager: () => void;
  onInspirationModeChange: (value: InspirationMode) => void;
  onKnowledgeDocumentIdsChange: (ids: string[]) => void;
  onReferenceModeChange: (value: WorldReferenceMode) => void;
  onPreserveTextChange: (value: string) => void;
  onAllowedChangesTextChange: (value: string) => void;
  onForbiddenTextChange: (value: string) => void;
  onInspirationTextChange: (value: string) => void;
  onOptionRefinementLevelChange: (value: WorldOptionRefinementLevel) => void;
  onOptionsCountChange: (value: number) => void;
  onAnalyze: () => void;
}

export default function WorldGeneratorStepOne(props: WorldGeneratorStepOneProps) {
  const {
    worldName,
    selectedGenreId,
    selectedGenre,
    genreOptions,
    genreLoading,
    inspirationMode,
    referenceMode,
    selectedKnowledgeDocumentIds,
    preserveText,
    allowedChangesText,
    forbiddenText,
    inspirationText,
    optionRefinementLevel,
    optionsCount,
    canAnalyze,
    analyzeStreaming,
    analyzeButtonLabel,
    analyzeProgressMessage,
    inspirationSourceMeta,
    concept,
    propertyOptionsCount,
    referenceAnchors,
    onWorldNameChange,
    onGenreChange,
    onOpenGenreManager,
    onInspirationModeChange,
    onKnowledgeDocumentIdsChange,
    onReferenceModeChange,
    onPreserveTextChange,
    onAllowedChangesTextChange,
    onForbiddenTextChange,
    onInspirationTextChange,
    onOptionRefinementLevelChange,
    onOptionsCountChange,
    onAnalyze,
  } = props;

  const isReferenceMode = inspirationMode === "reference";

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-md border p-2 text-sm"
        placeholder="Tên thế giới (không bắt buộc)"
        value={worldName}
        onChange={(event) => onWorldNameChange(event.target.value)}
      />

      <div className="space-y-2">
        <div className="text-sm font-medium">Thể loại thế giới</div>
        <select
          className="w-full rounded-md border bg-background p-2 text-sm"
          value={selectedGenreId}
          disabled={genreLoading || genreOptions.length === 0}
          onChange={(event) => onGenreChange(event.target.value)}
        >
          <option value="">{genreLoading ? "Đang tải nền thể loại..." : "Chọn nền thể loại"}</option>
          {genreOptions.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.path}
            </option>
          ))}
        </select>
        {selectedGenre ? (
          <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
            <div>Đường dẫn nền thể loại hiện tại: {selectedGenre.path}</div>
            {selectedGenre.description?.trim() ? <div>Mô tả nền thể loại: {selectedGenre.description.trim()}</div> : null}
            {selectedGenre.template?.trim() ? (
              <div className="whitespace-pre-wrap">Mẫu nền thể loại: {selectedGenre.template.trim()}</div>
            ) : null}
          </div>
        ) : null}
        {genreLoading ? <div className="text-xs text-muted-foreground">Đang tải cây nền thể loại...</div> : null}
        {!genreLoading && genreOptions.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-2">
            <div>Hiện chưa có nền thể loại nào khả dụng. Trình hướng dẫn thế giới quan sẽ thống nhất dùng kho nền thể loại.</div>
            <Button type="button" variant="outline" onClick={onOpenGenreManager}>
              Đi tới kho nền thể loại
            </Button>
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground">
          Ở đây dùng thẳng kho nền thể loại, không còn dùng danh sách loại tích hợp trong mẫu làm điểm vào nữa.
        </div>
        <div className="text-xs text-muted-foreground">
          Xác định nền thể loại trước rồi mới sinh thẻ ý tưởng, thuộc tính tiền đề và lọc mẫu về sau.
        </div>
      </div>

      <select
        className="w-full rounded-md border bg-background p-2 text-sm"
        value={inspirationMode}
        onChange={(event) => onInspirationModeChange(event.target.value as InspirationMode)}
      >
        <option value="free">Nhập tự do</option>
        <option value="reference">Tác phẩm tham chiếu</option>
        <option value="random">Lấy cảm hứng ngẫu nhiên</option>
      </select>

      {isReferenceMode ? (
        <div className="space-y-3">
          <KnowledgeDocumentPicker
            selectedIds={selectedKnowledgeDocumentIds}
            onChange={(next) => onKnowledgeDocumentIdsChange(next ?? [])}
            title="Tài liệu tri thức tham chiếu"
            description="Đây là nguồn tham chiếu; hệ thống sẽ trích mốc thế giới gốc trước rồi mới sinh hướng cải biên."
            queryStatus="enabled"
          />

          <div className="rounded-md border p-3 text-sm space-y-2">
            <div className="font-medium">Cách tham chiếu</div>
            <select
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={referenceMode}
              onChange={(event) => onReferenceModeChange(event.target.value as WorldReferenceMode)}
            >
              {REFERENCE_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              {REFERENCE_MODE_OPTIONS.find((item) => item.value === referenceMode)?.description}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="font-medium">Bắt buộc giữ lại</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder="Ví dụ: nền đô thị đời thực, cảm giác sống thuê nhà, giằng co cảm xúc của người trưởng thành"
                value={preserveText}
                onChange={(event) => onPreserveTextChange(event.target.value)}
              />
            </div>

            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="font-medium">Được phép cải biến</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder="Ví dụ: tầng lớp đô thị, quy tắc xã hội, mạng lưới thế lực, hệ thống địa điểm"
                value={allowedChangesText}
                onChange={(event) => onAllowedChangesTextChange(event.target.value)}
              />
            </div>

            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="font-medium">Cấm lệch hướng</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder="Ví dụ: không siêu nhiên hóa, không đi theo kiểu thăng cấp nhiệt huyết, không rời logic xã hội thực tế"
                value={forbiddenText}
                onChange={(event) => onForbiddenTextChange(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <textarea
        className="min-h-[180px] w-full rounded-md border p-2 text-sm"
        placeholder={
          isReferenceMode
            ? "Dán đoạn nguyên tác, phần tổng kết thế giới hoặc cách bạn hiểu tác phẩm; cũng có thể chỉ dùng tài liệu tri thức phía trên"
            : "Mô tả nguồn cảm hứng thế giới của bạn"
        }
        value={inspirationText}
        onChange={(event) => onInspirationTextChange(event.target.value)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="font-medium">Mức chi tiết của lựa chọn thuộc tính</div>
          <select
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={optionRefinementLevel}
            onChange={(event) => onOptionRefinementLevelChange(event.target.value as WorldOptionRefinementLevel)}
          >
            <option value="basic">Cơ bản</option>
            <option value="standard">Tiêu chuẩn</option>
            <option value="detailed">Chi tiết</option>
          </select>
        </div>

        <div className="rounded-md border p-3 text-sm space-y-2">
          <div className="font-medium">Số lượng thuộc tính tiền đề cần tạo</div>
          <input
            className="w-full rounded-md border p-2 text-sm"
            type="number"
            min={4}
            max={8}
            value={optionsCount}
            onChange={(event) => onOptionsCountChange(Number(event.target.value) || 6)}
          />
          <div className="text-xs text-muted-foreground">
            Bước này tham chiếu cách làm của bản V2 cũ: sinh ra các thuộc tính thế giới có thể chọn trước rồi mới chuyển sang tạo chính thức.
          </div>
        </div>
      </div>

      <Button onClick={onAnalyze} disabled={!canAnalyze}>
        {analyzeButtonLabel}
      </Button>

      {analyzeStreaming ? (
        <div className="rounded-md border p-3 text-sm space-y-1">
          <div className="font-medium">Tiến độ hiện tại</div>
          <div>{analyzeProgressMessage ?? "Đang khởi động phân tích..."}</div>
          <div className="text-xs text-muted-foreground">
            {isReferenceMode
            ? "Bước này sẽ chạy lần lượt: sắp xếp tư liệu tham chiếu, trích mốc thế giới gốc, sinh quyết định cải biên."
              : "Bước này sẽ chạy lần lượt: sắp xếp đầu vào cảm hứng, sinh thẻ ý tưởng, sinh lựa chọn thuộc tính tiền đề."}
          </div>
        </div>
      ) : null}

      {inspirationSourceMeta?.extracted ? (
        <div className="text-xs text-muted-foreground">
          Đã tự chia đoạn khi trích xuất: văn bản gốc {inspirationSourceMeta.originalLength} ký tự, chia thành {inspirationSourceMeta.chunkCount} đoạn.
        </div>
      ) : null}

      {concept ? (
        <div className="rounded-md border p-3 text-sm space-y-2">
        <div className="font-medium">{isReferenceMode ? "Tóm tắt tham chiếu" : "Thẻ ý tưởng"}</div>
          <div>Thể loại: {concept.worldType}</div>
          <div>Giọng điệu: {concept.tone}</div>
          <div>Từ khóa: {concept.keywords.join(" / ") || "-"}</div>
          <div>Lựa chọn thuộc tính tiền đề: {propertyOptionsCount}</div>
          {isReferenceMode && referenceAnchors.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Mốc thế giới gốc</div>
              {referenceAnchors.map((anchor) => (
                <div key={anchor.id} className="text-xs text-muted-foreground">
                  {anchor.label}：{anchor.content}
                </div>
              ))}
            </div>
          ) : null}
          <div className="whitespace-pre-wrap">{concept.summary}</div>
        </div>
      ) : null}
    </div>
  );
}
