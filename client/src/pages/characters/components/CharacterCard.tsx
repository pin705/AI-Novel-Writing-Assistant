import { useState, type ReactNode } from "react";
import type { ImageAsset } from "@ai-novel/shared/types/image";
import { resolveImageAssetUrl } from "@/api/images";
import type { BaseCharacter } from "@ai-novel/shared/types/novel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CharacterCardProps {
  character: BaseCharacter;
  assets: ImageAsset[];
  assetsLoading?: boolean;
  onGenerateImage: () => void;
  onSetPrimary: (assetId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  settingPrimary?: boolean;
  deleting?: boolean;
  extraActions?: ReactNode;
}

export function CharacterCard({
  character,
  assets,
  assetsLoading,
  onGenerateImage,
  onSetPrimary,
  onEdit,
  onDelete,
  settingPrimary,
  deleting,
  extraActions,
}: CharacterCardProps) {
  const [previewAsset, setPreviewAsset] = useState<ImageAsset | null>(null);

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
            Tạo ảnh nhân vật
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Chỉnh sửa
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} disabled={deleting}>
            {deleting ? "Đang xóa..." : "Xóa"}
          </Button>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground">Tính cách:</span>{character.personality || "Chưa có"}</div>
        <div><span className="text-muted-foreground">Ngoại hình / dáng vẻ:</span>{character.appearance || "Chưa có"}</div>
        <div><span className="text-muted-foreground">Điểm yếu và cái giá:</span>{character.weaknesses || "Chưa có"}</div>
        <div><span className="text-muted-foreground">Thói quen và sở trường:</span>{character.interests || "Chưa có"}</div>
        <div><span className="text-muted-foreground">Sự kiện then chốt:</span>{character.keyEvents || "Chưa có"}</div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Thư viện ảnh nhân vật</div>
        {assetsLoading ? <div className="text-xs text-muted-foreground">Đang tải...</div> : null}
        {!assetsLoading && assets.length === 0 ? (
          <div className="text-xs text-muted-foreground">Chưa có ảnh, hãy bấm “Tạo ảnh nhân vật” để tạo mới.</div>
        ) : null}
        {assets.length > 0 ? (
          <div className="grid justify-items-start gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {assets.map((asset) => (
              <div key={asset.id} className="w-full max-w-[300px] space-y-2 rounded-md border p-2">
                <button
                  type="button"
                  className="block aspect-square w-full overflow-hidden rounded-md bg-muted"
                  onClick={() => setPreviewAsset(asset)}
                  title="Bấm để xem trước"
                >
                  <img
                    src={resolveImageAssetUrl(asset.url)}
                    alt={`${character.name} - ảnh nhân vật`}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                    loading="lazy"
                  />
                </button>
                <div className="text-[11px] leading-4 text-muted-foreground break-all">
                  Đường dẫn cục bộ: {asset.localPath ?? "Chưa có file cục bộ"}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{asset.isPrimary ? "Ảnh chính" : "Ảnh dự phòng"}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={asset.isPrimary || settingPrimary}
                    onClick={() => onSetPrimary(asset.id)}
                  >
                    Đặt làm ảnh chính
                  </Button>
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
            <DialogTitle>{previewAsset ? `${character.name} - xem ảnh` : "Xem ảnh"}</DialogTitle>
          </DialogHeader>
          {previewAsset ? (
            <>
            <div className="flex max-h-[78vh] items-center justify-center overflow-auto rounded-md bg-muted/30 p-2">
              <img
                src={resolveImageAssetUrl(previewAsset.url)}
                alt={`${character.name} - ảnh xem trước`}
                className="max-h-[72vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
              {previewAsset.localPath ? (
                <div className="text-xs text-muted-foreground break-all">
                  Đường dẫn cục bộ: {previewAsset.localPath}
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
