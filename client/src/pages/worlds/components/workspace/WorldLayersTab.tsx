import type { Dispatch, SetStateAction } from "react";
import type { World } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StreamOutput from "@/components/common/StreamOutput";
import {
  LAYERS,
  LAYER_STATUS_LABELS,
  pickLayerFieldText,
  type LayerKey,
  type RefineAttribute,
  REFINE_ATTRIBUTE_OPTIONS,
} from "./worldWorkspaceShared";

interface WorldLayersTabProps {
  world?: World;
  selectedLayer: LayerKey;
  setSelectedLayer: (layer: LayerKey) => void;
  layerDrafts: Partial<Record<LayerKey, string>>;
  setLayerDrafts: Dispatch<SetStateAction<Partial<Record<LayerKey, string>>>>;
  layerStates: Record<string, { status: string; updatedAt: string }>;
  isInitialLayerGeneration: boolean;
  generateAllPending: boolean;
  generateLayerPending: boolean;
  generateLayerVariable?: LayerKey;
  saveLayerPending: boolean;
  saveLayerVariable?: { layerKey: LayerKey; content: string };
  confirmLayerPending: boolean;
  confirmLayerVariable?: LayerKey;
  onGenerateAll: () => void;
  onGenerateLayer: (layer: LayerKey) => void;
  onSaveLayer: (payload: { layerKey: LayerKey; content: string }) => void;
  onConfirmLayer: (layer: LayerKey) => void;
  refineAttribute: RefineAttribute;
  setRefineAttribute: (value: RefineAttribute) => void;
  refineMode: "replace" | "alternatives";
  setRefineMode: (value: "replace" | "alternatives") => void;
  refineLevel: "light" | "deep";
  setRefineLevel: (value: "light" | "deep") => void;
  onStartRefine: () => void;
  refineStreaming: boolean;
  refineContent: string;
  onAbortRefine: () => void;
}

export default function WorldLayersTab(props: WorldLayersTabProps) {
  const {
    world,
    selectedLayer,
    setSelectedLayer,
    layerDrafts,
    setLayerDrafts,
    layerStates,
    isInitialLayerGeneration,
    generateAllPending,
    generateLayerPending,
    generateLayerVariable,
    saveLayerPending,
    saveLayerVariable,
    confirmLayerPending,
    confirmLayerVariable,
    onGenerateAll,
    onGenerateLayer,
    onSaveLayer,
    onConfirmLayer,
    refineAttribute,
    setRefineAttribute,
    refineMode,
    setRefineMode,
    refineLevel,
    setRefineLevel,
    onStartRefine,
    refineStreaming,
    refineContent,
    onAbortRefine,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xây dựng theo lớp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
          <Button onClick={onGenerateAll} disabled={generateAllPending || !world}>
            {generateAllPending ? "Đang tạo 6 lớp..." : isInitialLayerGeneration ? "AI tạo 6 lớp lần đầu" : "Dựng lại 6 lớp bằng một nút"}
          </Button>
          <div className="text-xs text-muted-foreground">
            {isInitialLayerGeneration
              ? "Lần tạo đầu tiên bằng AI sẽ dựng song song 6 lớp."
              : "Lần tạo đầu đã hoàn tất, hiện hỗ trợ viết lại từng lớp."}
          </div>
        </div>

        <div className="space-y-3">
          {LAYERS.map((layer) => {
            const hasDraft = Object.prototype.hasOwnProperty.call(layerDrafts, layer.key);
            const worldRecord = world as unknown as Record<string, unknown> | undefined;
            const layerValue = hasDraft
              ? (layerDrafts[layer.key] ?? "")
              : pickLayerFieldText(layer.key, worldRecord);
            const layerStatus = layerStates[layer.key]?.status ?? "pending";
            const isGeneratingCurrentLayer = generateLayerPending && generateLayerVariable === layer.key;
            const isSavingCurrentLayer =
              saveLayerPending && saveLayerVariable?.layerKey === layer.key;
            const isConfirmingCurrentLayer =
              confirmLayerPending && confirmLayerVariable === layer.key;

            return (
              <div key={layer.key} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{layer.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Trạng thái: {LAYER_STATUS_LABELS[layerStatus] ?? layerStatus}
                  </div>
                </div>
                <textarea
                  className="min-h-[160px] w-full rounded-md border bg-background p-2 text-sm"
                  value={layerValue}
                  onFocus={() => setSelectedLayer(layer.key)}
                  onChange={(event) =>
                    setLayerDrafts((prev) => ({
                      ...prev,
                      [layer.key]: event.target.value,
                    }))
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      setSelectedLayer(layer.key);
                      if (isInitialLayerGeneration) {
                        onGenerateAll();
                        return;
                      }
                      onGenerateLayer(layer.key);
                    }}
                    disabled={generateAllPending || generateLayerPending || !world}
                  >
                    {isInitialLayerGeneration
                      ? generateAllPending
                        ? "Đang tạo 6 lớp..."
                        : "AI tạo 6 lớp lần đầu"
                      : isGeneratingCurrentLayer
                        ? "Đang viết lại..."
                        : "AI viết lại lớp này"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onSaveLayer({ layerKey: layer.key, content: layerValue })}
                    disabled={saveLayerPending || generateAllPending || !layerValue.trim()}
                  >
                    {isSavingCurrentLayer ? "Đang lưu..." : "Lưu lớp này thủ công"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onConfirmLayer(layer.key)}
                    disabled={confirmLayerPending || generateAllPending}
                  >
                    {isConfirmingCurrentLayer ? "Đang xác nhận..." : "Xác nhận lớp này"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border p-3">
          <div className="mb-2 text-sm font-medium">Tinh chỉnh</div>
          <div className="grid gap-2 md:grid-cols-4">
            <select
              className="rounded-md border bg-background p-2 text-sm"
              value={refineAttribute}
              onChange={(event) => setRefineAttribute(event.target.value as RefineAttribute)}
            >
              {REFINE_ATTRIBUTE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border bg-background p-2 text-sm"
              value={refineMode}
              onChange={(event) => setRefineMode(event.target.value as "replace" | "alternatives")}
            >
              <option value="replace">Tối ưu thay thế</option>
              <option value="alternatives">Đưa phương án thay thế</option>
            </select>
            <select
              className="rounded-md border bg-background p-2 text-sm"
              value={refineLevel}
              onChange={(event) => setRefineLevel(event.target.value as "light" | "deep")}
            >
              <option value="light">Nhẹ</option>
              <option value="deep">Sâu</option>
            </select>
            <Button onClick={onStartRefine} disabled={refineStreaming}>
              {refineStreaming ? "Đang tinh chỉnh..." : `Bắt đầu tinh chỉnh ${selectedLayer === "foundation" ? "thế giới hiện tại" : ""}`.trim()}
            </Button>
          </div>
          <StreamOutput content={refineContent} isStreaming={refineStreaming} onAbort={onAbortRefine} />
        </div>
      </CardContent>
    </Card>
  );
}
