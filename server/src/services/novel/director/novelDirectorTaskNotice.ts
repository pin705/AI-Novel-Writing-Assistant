import type { DirectorTaskNotice } from "@ai-novel/shared/types/novelDirector";
import { getBackendMessage } from "../../../i18n";

export function buildChapterTitleDiversityTaskNotice(input: {
  issue: string;
  volumeId?: string | null;
}): DirectorTaskNotice {
  return {
    code: "CHAPTER_TITLE_DIVERSITY",
    summary: input.issue.trim(),
    action: {
      type: "open_structured_outline",
      label: getBackendMessage("workflow.notice.action.quick_fix_chapter_titles"),
      volumeId: input.volumeId?.trim() || null,
    },
  };
}
