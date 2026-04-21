import { useEffect, useMemo, useState } from "react";
import type { StoryWorldSliceOverrides, StoryWorldSliceView } from "@ai-novel/shared/types/storyWorldSlice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NovelWorldUsageCardProps {
  view?: StoryWorldSliceView | null;
  message: string;
  isRefreshing: boolean;
  isSaving: boolean;
  onRefresh: () => void;
  onSave: (patch: StoryWorldSliceOverrides) => void;
}

function toggleId(ids: string[], id: string, checked: boolean): string[] {
  const set = new Set(ids);
  if (checked) {
    set.add(id);
  } else {
    set.delete(id);
  }
  return Array.from(set);
}

function labelStoryInputSource(source: string | null | undefined): string {
  switch (source) {
    case "explicit":
      return "Từ ý tưởng truyện bạn vừa nhập thủ công";
    case "story_macro":
      return "Từ ý tưởng truyện trong phần quy hoạch vĩ mô";
    case "novel_description":
      return "Từ phần giới thiệu tiểu thuyết";
    default:
      return "Chưa có";
  }
}

export default function NovelWorldUsageCard(props: NovelWorldUsageCardProps) {
  const [primaryLocationId, setPrimaryLocationId] = useState<string>("__none__");
  const [requiredForceIds, setRequiredForceIds] = useState<string[]>([]);
  const [requiredLocationIds, setRequiredLocationIds] = useState<string[]>([]);
  const [requiredRuleIds, setRequiredRuleIds] = useState<string[]>([]);
  const [scopeNote, setScopeNote] = useState("");

  useEffect(() => {
    setPrimaryLocationId(props.view?.overrides.primaryLocationId ?? "__none__");
    setRequiredForceIds(props.view?.overrides.requiredForceIds ?? []);
    setRequiredLocationIds(props.view?.overrides.requiredLocationIds ?? []);
    setRequiredRuleIds(props.view?.overrides.requiredRuleIds ?? []);
    setScopeNote(props.view?.overrides.scopeNote ?? "");
  }, [props.view]);

  const slice = props.view?.slice ?? null;
  const hasWorld = props.view?.hasWorld ?? false;
  const hasSlice = Boolean(slice);
  const canSave = hasWorld && Boolean(props.view);
  const savePayload = useMemo<StoryWorldSliceOverrides>(() => ({
    primaryLocationId: primaryLocationId === "__none__" ? null : primaryLocationId,
    requiredForceIds,
    requiredLocationIds,
    requiredRuleIds,
    scopeNote: scopeNote.trim() || null,
  }), [primaryLocationId, requiredForceIds, requiredLocationIds, requiredRuleIds, scopeNote]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Ranh giới thế giới xoay quanh cuốn sách này</CardTitle>
            <div className="text-sm leading-6 text-muted-foreground">
              Hệ thống sẽ kết hợp độc giả mục tiêu, điểm bán và cam kết giai đoạn đầu của cuốn sách để chắt ra từ thế giới đã gắn những tổ chức, địa điểm và quy tắc thật sự sẽ dùng. Bạn thường chỉ cần xác nhận sân khấu chính, các mục bắt buộc giữ lại ở giai đoạn đầu và phần ranh giới không được vượt qua.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.view?.isStale ? <Badge variant="secondary">Cần làm mới</Badge> : null}
            {slice ? <Badge variant="outline">Đã tạo</Badge> : null}
            <Button type="button" variant="outline" onClick={props.onRefresh} disabled={!hasWorld || props.isRefreshing}>
              {props.isRefreshing ? "Đang làm mới..." : "Sắp xếp lại thiết lập thế giới"}
            </Button>
            <Button type="button" onClick={() => props.onSave(savePayload)} disabled={!canSave || props.isSaving}>
              {props.isSaving ? "Đang lưu..." : "Lưu các mục giữ lại của cuốn sách này"}
            </Button>
          </div>
        </div>
        {props.message ? (
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {props.message}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasWorld ? (
          <div className="rounded-md border border-dashed border-border/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
            Cuốn tiểu thuyết này vẫn chưa gắn thế giới quan. Hãy chọn một thế giới ở phần “Thông tin cơ bản” phía trên, rồi hệ thống mới giúp bạn sắp xếp các thiết lập có thể dùng.
          </div>
        ) : null}

        {hasWorld ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 px-4 py-3">
              <div className="text-sm font-medium text-foreground">Đã gắn thế giới</div>
              <div className="mt-1 text-sm text-muted-foreground">{props.view?.worldName ?? "Thế giới chưa đặt tên"}</div>
            </div>
            <div className="rounded-lg border border-border/70 px-4 py-3">
              <div className="text-sm font-medium text-foreground">Nguồn ý tưởng truyện hiện tại</div>
              <div className="mt-1 text-sm text-muted-foreground">{labelStoryInputSource(props.view?.storyInputSource)}</div>
            </div>
          </div>
        ) : null}

        {slice ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/70 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Những gì cuốn sách hiện sẽ dùng</div>
              <div className="mt-3 space-y-4 text-sm">
                <div>
                  <div className="font-medium text-foreground">Nền tảng thế giới</div>
                  <div className="mt-1 leading-6 text-muted-foreground">{slice.coreWorldFrame || "Chưa có"}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Tổ chức sẽ dùng</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slice.activeForces.length > 0 ? slice.activeForces.map((item) => (
                      <Badge key={item.id} variant="secondary">{item.name}</Badge>
                    )) : <span className="text-muted-foreground">Chưa có</span>}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Địa điểm sẽ dùng</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slice.activeLocations.length > 0 ? slice.activeLocations.map((item) => (
                      <Badge key={item.id} variant="secondary">{item.name}</Badge>
                    )) : <span className="text-muted-foreground">Chưa có</span>}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Quy tắc cốt lõi</div>
                  <div className="mt-2 space-y-2">
                    {slice.appliedRules.length > 0 ? slice.appliedRules.map((item) => (
                      <div key={item.id} className="rounded-md bg-muted/30 px-3 py-2 text-muted-foreground">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="mt-1 leading-6">{item.summary}</div>
                      </div>
                    )) : <div className="text-muted-foreground">Chưa có</div>}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Nguồn áp lực chính</div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    {slice.pressureSources.length > 0 ? slice.pressureSources.map((item) => (
                      <div key={item}>{item}</div>
                    )) : <div>Chưa có</div>}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Ranh giới chưa nên vượt qua</div>
                  <div className="mt-1 leading-6 text-muted-foreground">{slice.storyScopeBoundary || "Chưa có"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Nếu muốn chỉ định thủ công, chỉ cần sửa vài mục này</div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">
                Sân khấu chính = nơi câu chuyện diễn ra nhiều nhất. Bắt buộc giữ lại ở giai đoạn đầu = những tổ chức, địa điểm hoặc quy tắc phải được đưa vào dù hệ thống có chắt lọc thế nào.
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Sân khấu chính</label>
                  <Select value={primaryLocationId} onValueChange={setPrimaryLocationId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Hãy chọn sân khấu chính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Không chỉ định thêm</SelectItem>
                      {props.view?.availableLocations.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Tổ chức bắt buộc giữ ở giai đoạn đầu</div>
                  <div className="mt-2 grid gap-2">
                    {props.view?.availableForces.length ? props.view.availableForces.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={requiredForceIds.includes(item.id)}
                          onChange={(event) => setRequiredForceIds((prev) => toggleId(prev, item.id, event.target.checked))}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-medium text-foreground">{item.name}</span>
                          <span className="block text-muted-foreground">{item.summary}</span>
                        </span>
                      </label>
                    )) : <div className="text-sm text-muted-foreground">Thế giới hiện tại chưa có tổ chức nào để chọn.</div>}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Địa điểm bắt buộc giữ ở giai đoạn đầu</div>
                  <div className="mt-2 grid gap-2">
                    {props.view?.availableLocations.length ? props.view.availableLocations.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={requiredLocationIds.includes(item.id)}
                          onChange={(event) => setRequiredLocationIds((prev) => toggleId(prev, item.id, event.target.checked))}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-medium text-foreground">{item.name}</span>
                          <span className="block text-muted-foreground">{item.summary}</span>
                        </span>
                      </label>
                    )) : <div className="text-sm text-muted-foreground">Thế giới hiện tại chưa có địa điểm nào để chọn.</div>}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-foreground">Quy tắc bắt buộc giữ ở giai đoạn đầu</div>
                  <div className="mt-2 grid gap-2">
                    {props.view?.availableRules.length ? props.view.availableRules.map((item) => (
                      <label key={item.id} className="flex items-start gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={requiredRuleIds.includes(item.id)}
                          onChange={(event) => setRequiredRuleIds((prev) => toggleId(prev, item.id, event.target.checked))}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-medium text-foreground">{item.name}</span>
                          <span className="block text-muted-foreground">{item.summary}</span>
                        </span>
                      </label>
                    )) : <div className="text-sm text-muted-foreground">Thế giới hiện tại chưa có quy tắc nào để chọn.</div>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground" htmlFor="story-world-scope-note">
                    Mô tả ranh giới không nên vượt qua ở giai đoạn đầu
                  </label>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    Nếu bạn muốn thêm một câu giới hạn, chẳng hạn “giữ nền đô thị hiện thực, đừng biến sang truyện huyền huyễn thăng cấp”, hãy viết ở đây.
                  </div>
                  <textarea
                    id="story-world-scope-note"
                    value={scopeNote}
                    onChange={(event) => setScopeNote(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Ví dụ: giữ bối cảnh thương trường hiện thực và cảm giác áp lực lên nhân vật, không đưa vào hệ siêu nhiên."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {hasWorld && !hasSlice ? (
          <div className="rounded-md border border-dashed border-border/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
            Hệ thống vẫn chưa sắp xếp ra các thiết lập thế giới mà cuốn sách này sẽ dùng. Bấm “Sắp xếp lại thiết lập thế giới” để hệ thống tự tạo một bản khả dụng dựa trên thế giới hiện tại và ý tưởng truyện.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
