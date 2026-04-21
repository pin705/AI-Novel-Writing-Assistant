import type { WorldConsistencyIssue, WorldConsistencyReport } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  localizeConsistencyField,
  localizeConsistencyIssueDetail,
  localizeConsistencyIssueMessage,
  localizeConsistencyIssueTitle,
  localizeConsistencySeverity,
  localizeConsistencySource,
  localizeConsistencyStatus,
} from "../../worldConsistencyUi";

interface WorldConsistencyTabProps {
  report: WorldConsistencyReport | null;
  issues: WorldConsistencyIssue[];
  checkPending: boolean;
  onCheck: () => void;
  onPatchIssue: (payload: { issueId: string; status: "open" | "resolved" | "ignored" }) => void;
}

export default function WorldConsistencyTab(props: WorldConsistencyTabProps) {
  const { report, issues, checkPending, onCheck, onPatchIssue } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kiểm tra nhất quán</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onCheck} disabled={checkPending}>
          {checkPending ? "Đang kiểm tra..." : "Chạy kiểm tra nhất quán"}
        </Button>
        {report ? (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Trạng thái kiểm tra</div>
              <div className="mt-1 font-semibold">{localizeConsistencyStatus(report.status)}</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">Điểm nhất quán</div>
              <div className="mt-1 font-semibold">{report.score}</div>
            </div>
            <div className="rounded-md border p-3 text-sm md:col-span-2">
              <div className="text-xs text-muted-foreground">Tóm tắt kiểm tra</div>
              <div className="mt-1 font-medium">{report.summary}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Thời gian tạo: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "Không rõ"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Chưa có báo cáo nhất quán.</div>
        )}
        {issues.map((issue) => (
          <div key={issue.id} className="rounded-md border p-3 space-y-2">
            <div className="font-medium">
              [{localizeConsistencySeverity(issue.severity)}] {localizeConsistencyIssueTitle(issue.code)}
            </div>
            <div className="text-sm">{localizeConsistencyIssueMessage(issue)}</div>
            <div className="text-xs text-muted-foreground">
              {localizeConsistencyIssueDetail(issue) ?? "Chưa có mô tả bổ sung"}
            </div>
            <div className="text-xs text-muted-foreground">
              Nguồn: {localizeConsistencySource(issue.source)} | Trường ảnh hưởng:
              {localizeConsistencyField(issue.targetField)} | Trạng thái hiện tại:
              {localizeConsistencyStatus(issue.status)}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onPatchIssue({ issueId: issue.id, status: "resolved" })}
              >
                Đánh dấu đã giải quyết
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPatchIssue({ issueId: issue.id, status: "ignored" })}
              >
                Bỏ qua
              </Button>
            </div>
          </div>
        ))}
        {issues.length === 0 ? (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            Chưa có bản ghi vấn đề nhất quán nào, kết quả sẽ hiện ở đây sau khi chạy kiểm tra.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
