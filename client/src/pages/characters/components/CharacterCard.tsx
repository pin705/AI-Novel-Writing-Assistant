import { useState, type ReactNode } from "react";
import type { ImageAsset } from "@ai-novel/shared/types/image";
import { resolveImageAssetUrl } from "@/api/images";
import type { BaseCharacter } from "@ai-novel/shared/types/novel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/i18n";


interface CharacterCardProps {
  character: BaseCharacter;
  assets: ImageAsset[];
  assetsLoading?: boolean;
  onGenerateImage: () => void;
  onSetPrimary: (assetId: string) => void;
  onDeleteAsset: (asset: ImageAsset) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
  settingPrimary?: boolean;
  deletingAssetId?: string | null;
  deleting?: boolean;
  extraActions?: ReactNode;
}

export function CharacterCard({
  character,
  assets,
  assetsLoading,
  onGenerateImage,
  onSetPrimary,
  onDeleteAsset,
  onEdit,
  onDelete,
  settingPrimary,
  deletingAssetId,
  deleting,
  extraActions,
}: CharacterCardProps) {
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

  const handleDeleteAsset = async (asset: ImageAsset) => {
    const confirmed = window.confirm(t("确认删除这张形象图？此操作不可恢复。"));
    if (!confirmed) {
      return;
    }
    try {
      await onDeleteAsset(asset);
      setPreviewAsset((current) => (current?.id === asset.id ? null : current));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("删除图片失败，请稍后重试。"));
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{character.name}</div>
          <div className="text-sm text-muted-foreground">{character.role}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {extraActions}
          <Button size="sm" variant="outline" onClick={onGenerateImage}>
            {t("生成形象图")}</Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            {t("编辑")}</Button>
          <Button size="sm" variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? t("删除中...") : t("删除")}
          </Button>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground">{t("性格：")}</span>{character.personality || t("暂无")}</div>
        <div><span className="text-muted-foreground">{t("外貌/体态：")}</span>{character.appearance || t("暂无")}</div>
        <div><span className="text-muted-foreground">{t("弱点与代价：")}</span>{character.weaknesses || t("暂无")}</div>
        <div><span className="text-muted-foreground">{t("习惯与特长：")}</span>{character.interests || t("暂无")}</div>
        <div><span className="text-muted-foreground">{t("关键事件：")}</span>{character.keyEvents || t("暂无")}</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">{t("形象图库")}</div>
        {assetsLoading ? <div className="text-xs text-muted-foreground">{t("加载中...")}</div> : null}
        {!assetsLoading && assets.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("暂无图片，点击“生成形象图”创建。")}</div>
        ) : null}
        {assets.length > 0 ? (
          <div className="grid justify-items-start gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {assets.map((asset) => (
              <div key={asset.id} className="w-full max-w-[300px] space-y-2 rounded-md border p-2">
                <button
                  type="button"
                  className="block aspect-square w-full overflow-hidden rounded-md bg-muted"
                  onClick={() => setPreviewAsset(asset)}
                  title={t("点击预览")}
                >
                  <img
                    src={resolveImageAssetUrl(asset.url)}
                    alt={t("{{name}}-形象图", { name: character.name })}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
                <div className="text-[11px] leading-4 text-muted-foreground break-all">
                  {t("本地路径：")}{asset.localPath ?? t("未落地本地文件")}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{asset.isPrimary ? t("主图") : t("候选图")}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={asset.isPrimary || settingPrimary || deletingAssetId === asset.id}
                      onClick={() => onSetPrimary(asset.id)}
                    >
                      {t("设为主图")}</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingAssetId === asset.id}
                      onClick={() => void handleDeleteAsset(asset)}
                    >
                      {deletingAssetId === asset.id ? t("删除中...") : t("删除")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(previewAsset)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewAsset(null);
          }
        }}
      >
        <DialogContent className="w-[96vw] max-w-[1000px]">
          <DialogHeader>
            <DialogTitle>{previewAsset ? t("{{name}} - 图片预览", { name: character.name }) : t("图片预览")}</DialogTitle>
          </DialogHeader>
          {previewAsset ? (
            <>
            <div className="flex max-h-[78vh] items-center justify-center overflow-auto rounded-md bg-muted/30 p-2">
              <img
                src={resolveImageAssetUrl(previewAsset.url)}
                alt={t("{{name}}-预览图", { name: character.name })}
                className="max-h-[72vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
              {previewAsset.localPath ? (
                <div className="text-xs text-muted-foreground break-all">
                  {t("本地路径：")}{previewAsset.localPath}
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={previewAsset.isPrimary || settingPrimary || deletingAssetId === previewAsset.id}
                  onClick={() => onSetPrimary(previewAsset.id)}
                >
                  {t("设为主图")}</Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletingAssetId === previewAsset.id}
                  onClick={() => void handleDeleteAsset(previewAsset)}
                >
                  {deletingAssetId === previewAsset.id ? t("删除中...") : t("删除图片")}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
