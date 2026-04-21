import type { Dispatch, SetStateAction } from "react";
import type { WorldDeepeningQuestion } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorldDeepeningTabProps {
  questions: WorldDeepeningQuestion[];
  answerDrafts: Record<string, string>;
  setAnswerDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  llmQuickOptions: Record<string, string[]>;
  generatePending: boolean;
  submitPending: boolean;
  onGenerate: () => void;
  onSubmit: () => void;
}

export default function WorldDeepeningTab(props: WorldDeepeningTabProps) {
  const {
    questions,
    answerDrafts,
    setAnswerDrafts,
    llmQuickOptions,
    generatePending,
    submitPending,
    onGenerate,
    onSubmit,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đào sâu hỏi đáp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onGenerate} disabled={generatePending}>
          {generatePending ? "Đang tạo..." : "Tạo câu hỏi đào sâu"}
        </Button>
        {questions.map((question) => {
          const quickOptions = (question.quickOptions ?? llmQuickOptions[question.id] ?? [])
            .map((option) => option.trim())
            .filter(Boolean)
            .slice(0, 4);

          return (
            <div key={question.id} className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium">
                [{question.priority}] {question.question}
              </div>
              {quickOptions.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Tùy chọn nhanh (do mô hình trả về, có thể bấm để điền ngay)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickOptions.map((option) => (
                      <Button
                        key={`${question.id}-${option}`}
                        size="sm"
                        variant={answerDrafts[question.id] === option ? "default" : "outline"}
                        className="h-auto whitespace-normal text-left"
                        onClick={() =>
                          setAnswerDrafts((prev) => ({ ...prev, [question.id]: option }))
                        }
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Câu hỏi hiện tại chưa trả về tùy chọn nhanh, hãy nhập câu trả lời trực tiếp.
                </div>
              )}
              <textarea
                className="min-h-[100px] w-full rounded-md border bg-background p-2 text-sm"
                value={answerDrafts[question.id] ?? ""}
                onChange={(event) =>
                  setAnswerDrafts((prev) => ({ ...prev, [question.id]: event.target.value }))
                }
                placeholder="Nhập câu trả lời của bạn"
              />
              <div className="text-xs text-muted-foreground">
                target: {question.targetLayer ?? "-"} / {question.targetField ?? "-"} / status:{" "}
                {question.status}
              </div>
            </div>
          );
        })}
        <Button
          onClick={onSubmit}
          disabled={submitPending || Object.keys(answerDrafts).length === 0 || questions.length === 0}
        >
          {submitPending ? "Đang tổng hợp..." : "Gửi và tổng hợp câu trả lời"}
        </Button>
      </CardContent>
    </Card>
  );
}
