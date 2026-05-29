import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";

interface WorldGeneratorStepThreeProps {
  axioms: string[];
  finalizePending: boolean;
  onAxiomChange: (index: number, value: string) => void;
  onAddAxiom: () => void;
  onFinalize: () => void;
}

export default function WorldGeneratorStepThree(props: WorldGeneratorStepThreeProps) {
  const { axioms, finalizePending, onAxiomChange, onAddAxiom, onFinalize } = props;
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        {t("worlds.generator.stepThree.hint")}
      </div>
      {axioms.map((axiom, index) => (
        <Input
          key={`${index}-${axiom}`}
          value={axiom}
          onChange={(event) => onAxiomChange(index, event.target.value)}
        />
      ))}
      <Button variant="secondary" onClick={onAddAxiom}>
        {t("worlds.generator.stepThree.addAxiom")}
      </Button>
      <Button onClick={onFinalize} disabled={finalizePending}>
        {finalizePending ? t("worlds.generator.stepThree.saving") : t("worlds.generator.stepThree.finalize")}
      </Button>
    </div>
  );
}
