import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WorldGeneratorStepThreeProps {
  axioms: string[];
  finalizePending: boolean;
  onAxiomChange: (index: number, value: string) => void;
  onAddAxiom: () => void;
  onFinalize: () => void;
}

export default function WorldGeneratorStepThree(props: WorldGeneratorStepThreeProps) {
  const { axioms, finalizePending, onAxiomChange, onAddAxiom, onFinalize } = props;

  return (
    <div className="space-y-3">
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        Đây là các quy tắc cốt lõi hệ thống đã tổng hợp sẵn. Bạn có thể sửa trực tiếp hoặc giữ nguyên rồi vào trang chỉnh sửa để hoàn thiện tiếp.
      </div>
      {axioms.map((axiom, index) => (
        <Input
          key={`${index}-${axiom}`}
          value={axiom}
          onChange={(event) => onAxiomChange(index, event.target.value)}
        />
      ))}
      <Button variant="secondary" onClick={onAddAxiom}>
        Thêm quy tắc
      </Button>
      <Button onClick={onFinalize} disabled={finalizePending}>
        {finalizePending ? "Đang lưu..." : "Vào thế giới làm việc"}
      </Button>
    </div>
  );
}
