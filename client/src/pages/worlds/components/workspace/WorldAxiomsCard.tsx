import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function parseAxiomList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function WorldAxiomsCard(props: {
  rawAxioms?: string | null;
  savePending: boolean;
  onSave: (axioms: string[]) => void;
}) {
  const { rawAxioms, savePending, onSave } = props;
  const parsedAxioms = useMemo(() => parseAxiomList(rawAxioms), [rawAxioms]);
  const [draftAxioms, setDraftAxioms] = useState<string[]>(parsedAxioms.length > 0 ? parsedAxioms : [""]);

  useEffect(() => {
    setDraftAxioms(parsedAxioms.length > 0 ? parsedAxioms : [""]);
  }, [parsedAxioms]);

  const normalizedDrafts = draftAxioms.map((item) => item.trim()).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quy tắc cốt lõi (công lý)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Có thể hiểu đây là “những quy tắc nền mà thế giới này không thể phá vỡ tùy tiện”. Các bước sinh tự động và kiểm tra nhất quán phía sau đều sẽ tham chiếu phần này.
        </div>
        {draftAxioms.map((axiom, index) => (
          <Input
            key={`${index}-${axiom}`}
            value={axiom}
            placeholder={`Quy tắc cốt lõi ${index + 1}`}
            onChange={(event) =>
              setDraftAxioms((prev) => prev.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
            }
          />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setDraftAxioms((prev) => [...prev, ""])}>
            Thêm một dòng
          </Button>
          <Button
            type="button"
            onClick={() => onSave(normalizedDrafts)}
            disabled={savePending || normalizedDrafts.length === 0}
          >
            {savePending ? "Đang lưu..." : "Lưu quy tắc cốt lõi"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
