import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";


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
        {t("这些是系统先整理出的核心规则。你可以直接改字，也可以保持不动后进入编辑页继续细化。")}</div>
      {axioms.map((axiom, index) => (
        <Input
          key={`${index}-${axiom}`}
          value={axiom}
          onChange={(event) => onAxiomChange(index, event.target.value)}
        />
      ))}
      <Button variant="secondary" onClick={onAddAxiom}>
        {t("新增公理")}</Button>
      <Button onClick={onFinalize} disabled={finalizePending}>
        {finalizePending ? t("保存中...") : t("进入世界工作台")}
      </Button>
    </div>
  );
}
