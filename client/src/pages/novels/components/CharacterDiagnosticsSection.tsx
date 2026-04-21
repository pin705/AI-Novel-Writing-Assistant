import { useEffect, useState } from "react";
import type { Character } from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import CharacterCastOptionsSection from "./CharacterCastOptionsSection";
import CharacterDynamicsSection from "./CharacterDynamicsSection";
import CollapsibleSummary from "./CollapsibleSummary";

interface CharacterDiagnosticsSectionProps {
  novelId: string;
  characters: Character[];
  selectedCharacter?: Character;
  selectedCharacterId: string;
  onSelectedCharacterChange: (id: string) => void;
  llmProvider?: LLMProvider;
  llmModel?: string;
  defaultOpen?: boolean;
}

export default function CharacterDiagnosticsSection(props: CharacterDiagnosticsSectionProps) {
  const {
    novelId,
    characters,
    selectedCharacter,
    selectedCharacterId,
    onSelectedCharacterChange,
    llmProvider,
    llmModel,
    defaultOpen = true,
  } = props;

  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <details
      className="group rounded-2xl border border-border/70 bg-background/95 p-4"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none">
        <CollapsibleSummary
          title="Chẩn đoán đội hình nhân vật và quan hệ"
          description="Phần này hợp hơn khi cần bù vị trí, kiểm tra khoảng trống hoặc gỡ rối quan hệ. Khi chỉnh sửa hằng ngày, hãy xem khu làm việc tài sản nhân vật bên dưới trước."
        />
      </summary>

      <div className="mt-4 space-y-4">
        <CharacterCastOptionsSection
          novelId={novelId}
          characters={characters}
          selectedCharacter={selectedCharacter}
          onSelectedCharacterChange={onSelectedCharacterChange}
          llmProvider={llmProvider}
          llmModel={llmModel}
        />

        <CharacterDynamicsSection
          novelId={novelId}
          selectedCharacter={selectedCharacter}
          selectedCharacterId={selectedCharacterId}
          onSelectedCharacterChange={onSelectedCharacterChange}
        />
      </div>
    </details>
  );
}
