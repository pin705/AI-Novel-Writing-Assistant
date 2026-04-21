import { useMemo, useState } from "react";
import type { AntiAiRule } from "@ai-novel/shared/types/styleEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WritingFormulaRulesPanelProps {
  antiAiRules: AntiAiRule[];
  onToggleRule: (rule: AntiAiRule, enabled: boolean) => void;
}

export default function WritingFormulaRulesPanel(props: WritingFormulaRulesPanelProps) {
  const { antiAiRules, onToggleRule } = props;
  const [open, setOpen] = useState(false);

  const enabledCount = useMemo(
    () => antiAiRules.filter((rule) => rule.enabled).length,
    [antiAiRules],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Kho đặc trưng chống AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            Đã bật {enabledCount} / {antiAiRules.length} quy tắc
          </div>
          <div className="text-sm text-muted-foreground">
            Đưa kho quy tắc vào cửa sổ riêng để trang chính tập trung hơn vào chỉnh sửa và ứng dụng phong cách viết.
          </div>
          <Button className="w-full" variant="secondary" onClick={() => setOpen(true)}>
            Mở kho quy tắc
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Kho đặc trưng chống AI</DialogTitle>
            <DialogDescription>
              Đây là nơi phù hợp hơn để duyệt quy tắc, lọc, bật/tắt và mở rộng chỉnh sửa sau này.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {antiAiRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{rule.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {rule.type} / {rule.severity}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => onToggleRule(rule, event.target.checked)}
                    />
                    Bật
                  </label>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{rule.description}</div>
                {rule.promptInstruction ? (
                  <div className="mt-3 rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
                    Prompt：{rule.promptInstruction}
                  </div>
                ) : null}
                {rule.rewriteSuggestion ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Gợi ý sửa: {rule.rewriteSuggestion}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
