import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AntiAiRule, StyleBinding, StyleProfileFeature } from "@ai-novel/shared/types/styleEngine";
import { useSearchParams } from "react-router-dom";
import OpenInCreativeHubButton from "@/components/creativeHub/OpenInCreativeHubButton";
import { getNovelDetail, getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import {
  createManualStyleProfile,
  createStyleBinding,
  createStyleProfileFromBrief,
  createStyleProfileFromText,
  createStyleProfileFromTemplate,
  deleteStyleBinding,
  deleteStyleProfile,
  detectStyleIssues,
  extractStyleFeaturesFromText,
  getAntiAiRules,
  getStyleBindings,
  getStyleProfiles,
  getStyleTemplates,
  rewriteStyleIssues,
  testWriteWithStyleProfile,
  updateAntiAiRule,
  updateStyleProfile,
} from "@/api/styleEngine";
import { useLLMStore } from "@/store/llmStore";
import WritingFormulaEditorPanel from "./components/WritingFormulaEditorPanel";
import WritingFormulaSidebar from "./components/WritingFormulaSidebar";
import WritingFormulaWorkbenchPanel from "./components/WritingFormulaWorkbenchPanel";
import {
  buildProfileFeaturesFromDraft,
  buildRuleSetFromExtractedFeatures,
  normalizeCsv,
  parseJsonInput,
  prettyJson,
} from "./writingFormula.utils";

export default function WritingFormulaPage() {
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [message, setMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    manualName: "",
    briefName: "",
    briefCategory: "",
    briefPrompt: "",
    extractName: "",
    extractCategory: "",
    extractSourceText: "",
  });
  const [editor, setEditor] = useState({
    name: "",
    description: "",
    category: "",
    tags: "",
    applicableGenres: "",
    sourceContent: "",
    extractedFeatures: [] as StyleProfileFeature[],
    analysisMarkdown: "",
    narrativeRules: "{}",
    characterRules: "{}",
    languageRules: "{}",
    rhythmRules: "{}",
    antiAiRuleIds: [] as string[],
  });
  const [bindingForm, setBindingForm] = useState({
    targetType: "novel" as StyleBinding["targetType"],
    novelId: "",
    chapterId: "",
    taskTargetId: "",
    priority: 1,
    weight: 1,
  });
  const [testWriteForm, setTestWriteForm] = useState({
    mode: "generate" as "generate" | "rewrite",
    topic: "",
    sourceText: "",
    targetLength: 1200,
  });
  const [testWriteOutput, setTestWriteOutput] = useState("");
  const [detectInput, setDetectInput] = useState("");
  const [rewritePreview, setRewritePreview] = useState("");

  const profilesQuery = useQuery({
    queryKey: queryKeys.styleEngine.profiles,
    queryFn: getStyleProfiles,
  });
  const templatesQuery = useQuery({
    queryKey: queryKeys.styleEngine.templates,
    queryFn: getStyleTemplates,
  });
  const antiAiRulesQuery = useQuery({
    queryKey: queryKeys.styleEngine.antiAiRules,
    queryFn: getAntiAiRules,
  });
  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(1, 100),
    queryFn: () => getNovelList({ page: 1, limit: 100 }),
  });
  const novelDetailQuery = useQuery({
    queryKey: queryKeys.novels.detail(bindingForm.novelId || "none"),
    queryFn: () => getNovelDetail(bindingForm.novelId),
    enabled: Boolean(bindingForm.novelId),
  });
  const bindingsQuery = useQuery({
    queryKey: queryKeys.styleEngine.bindings(selectedProfileId || "all"),
    queryFn: () => getStyleBindings(selectedProfileId ? { styleProfileId: selectedProfileId } : undefined),
  });

  const profiles = profilesQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const antiAiRules = antiAiRulesQuery.data?.data ?? [];
  const bindings = bindingsQuery.data?.data ?? [];
  const novelOptions = (novelListQuery.data?.data?.items ?? []).map((novel) => ({
    id: novel.id,
    title: novel.title,
  }));
  const chapterOptions = (novelDetailQuery.data?.data?.chapters ?? []).map((chapter) => ({
    id: chapter.id,
    order: chapter.order,
    title: chapter.title,
  }));
  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );
  const incomingProfileId = searchParams.get("profileId") ?? "";
  const incomingSource = searchParams.get("source") ?? "";

  useEffect(() => {
    if (incomingProfileId) {
      return;
    }
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [incomingProfileId, profiles, selectedProfileId]);

  useEffect(() => {
    if (!incomingProfileId || profiles.length === 0) {
      return;
    }
    const incomingProfile = profiles.find((item) => item.id === incomingProfileId);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("profileId");
    nextSearchParams.delete("source");

    if (!incomingProfile) {
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    setSelectedProfileId(incomingProfile.id);
    if (incomingSource === "book-analysis") {
      setMessage(`Đã tạo phong cách viết từ bản phân tích sách “${incomingProfile.name}”, bạn có thể tiếp tục chỉnh sửa, ràng buộc và thử viết.`);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }, [incomingProfileId, incomingSource, profiles, searchParams, setSearchParams]);

  useEffect(() => {
    if (!bindingForm.novelId && novelOptions.length > 0) {
      setBindingForm((prev) => ({ ...prev, novelId: novelOptions[0].id }));
    }
  }, [bindingForm.novelId, novelOptions]);

  useEffect(() => {
    if (!selectedProfile) {
      return;
    }
    setEditor({
      name: selectedProfile.name,
      description: selectedProfile.description ?? "",
      category: selectedProfile.category ?? "",
      tags: selectedProfile.tags.join(", "),
      applicableGenres: selectedProfile.applicableGenres.join(", "),
      sourceContent: selectedProfile.sourceContent ?? "",
      extractedFeatures: selectedProfile.extractedFeatures ?? [],
      analysisMarkdown: selectedProfile.analysisMarkdown ?? "",
      narrativeRules: prettyJson(selectedProfile.narrativeRules),
      characterRules: prettyJson(selectedProfile.characterRules),
      languageRules: prettyJson(selectedProfile.languageRules),
      rhythmRules: prettyJson(selectedProfile.rhythmRules),
      antiAiRuleIds: selectedProfile.antiAiRules.map((rule) => rule.id),
    });
    setTestWriteOutput("");
    setDetectInput("");
    setRewritePreview("");
  }, [selectedProfile]);

  async function refreshStyleData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.profiles }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.templates }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.antiAiRules }),
      queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings(selectedProfileId || "all") }),
    ]);
  }

  const createManualMutation = useMutation({
    mutationFn: () => createManualStyleProfile({ name: createForm.manualName }),
    onSuccess: async (response) => {
      if (response.data) {
        setSelectedProfileId(response.data.id);
        setCreateForm((prev) => ({ ...prev, manualName: "" }));
        setMessage("Đã tạo một tài sản phong cách viết trống.");
      }
      await refreshStyleData();
    },
  });

  const createFromTextMutation = useMutation({
    mutationFn: () => createStyleProfileFromText({
      name: createForm.extractName,
      category: createForm.extractCategory || undefined,
      sourceText: createForm.extractSourceText,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: async (response) => {
      if (response.data) {
        setSelectedProfileId(response.data.id);
        const featureCount = response.data.extractedFeatures?.length ?? 0;
        setMessage(
          featureCount > 0
            ? `Đã trích xuất ${featureCount} đặc trưng, bạn có thể tick từng mục trong vùng “Bật đặc trưng trích xuất” ở trang chỉnh sửa.`
            : "Đã tạo tài sản phong cách viết, nhưng lần này chưa sinh ra các đặc trưng có thể chọn. Bạn có thể trích xuất lại ngay trong trang chỉnh sửa.",
        );
      }
      await refreshStyleData();
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: (templateId: string) => createStyleProfileFromTemplate({ templateId }),
    onSuccess: async (response) => {
      if (response.data) {
        setSelectedProfileId(response.data.id);
        setMessage("Đã tạo tài sản phong cách viết dựa trên mẫu.");
      }
      await refreshStyleData();
    },
  });

  const createFromBriefMutation = useMutation({
    mutationFn: () => createStyleProfileFromBrief({
      brief: createForm.briefPrompt,
      name: createForm.briefName || undefined,
      category: createForm.briefCategory || undefined,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: async (response) => {
      if (response.data) {
        setSelectedProfileId(response.data.id);
        setCreateForm((prev) => ({
          ...prev,
          briefName: "",
          briefCategory: "",
          briefPrompt: "",
        }));
        setMessage("AI đã tạo một bộ phong cách khởi đầu dựa trên mô tả của bạn, bạn có thể chỉnh tiếp ngay.");
      }
      await refreshStyleData();
    },
  });

  const reextractFeaturesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId || !editor.sourceContent.trim()) {
        throw new Error("Vui lòng chuẩn bị mẫu văn bản trước.");
      }
      return extractStyleFeaturesFromText({
        name: editor.name.trim() || selectedProfile?.name || "Phong cách trích xuất từ văn bản",
        category: editor.category || undefined,
        sourceText: editor.sourceContent,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      });
    },
    onSuccess: (response) => {
      const draft = response.data;
      if (!draft) {
        return;
      }
      const extractedFeatures = buildProfileFeaturesFromDraft(draft);
      const ruleSet = buildRuleSetFromExtractedFeatures(extractedFeatures);
      setEditor((prev) => ({
        ...prev,
        extractedFeatures,
        analysisMarkdown: draft.summary || prev.analysisMarkdown,
        narrativeRules: prettyJson(ruleSet.narrativeRules),
        characterRules: prettyJson(ruleSet.characterRules),
        languageRules: prettyJson(ruleSet.languageRules),
        rhythmRules: prettyJson(ruleSet.rhythmRules),
      }));
      setMessage(
        extractedFeatures.length > 0
          ? `Đã trích xuất lại ${extractedFeatures.length} đặc trưng, nhớ tick xác nhận rồi lưu lại.`
          : "Lần này vẫn chưa tạo ra đặc trưng có thể chọn, mình đã giữ trạng thái trống trong trang chỉnh sửa.",
      );
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) {
        return;
      }
      await updateStyleProfile(selectedProfileId, {
        name: editor.name,
        description: editor.description,
        category: editor.category,
        tags: normalizeCsv(editor.tags),
        applicableGenres: normalizeCsv(editor.applicableGenres),
        sourceContent: editor.sourceContent || undefined,
        extractedFeatures: editor.extractedFeatures,
        analysisMarkdown: editor.analysisMarkdown,
        narrativeRules: parseJsonInput(editor.narrativeRules),
        characterRules: parseJsonInput(editor.characterRules),
        languageRules: parseJsonInput(editor.languageRules),
        rhythmRules: parseJsonInput(editor.rhythmRules),
        antiAiRuleIds: editor.antiAiRuleIds,
      });
    },
    onSuccess: async () => {
      setMessage("Tài sản phong cách viết đã được lưu.");
      await refreshStyleData();
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id: string) => deleteStyleProfile(id),
    onSuccess: async () => {
      setSelectedProfileId("");
      setMessage("Tài sản phong cách viết đã được xóa.");
      await refreshStyleData();
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ rule, enabled }: { rule: AntiAiRule; enabled: boolean }) =>
      updateAntiAiRule(rule.id, { enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.antiAiRules });
    },
  });

  const createBindingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) {
        return;
      }
      const targetId = bindingForm.targetType === "chapter"
        ? bindingForm.chapterId
        : bindingForm.targetType === "task"
          ? bindingForm.taskTargetId
          : bindingForm.novelId;
      await createStyleBinding({
        styleProfileId: selectedProfileId,
        targetType: bindingForm.targetType,
        targetId,
        priority: bindingForm.priority,
        weight: bindingForm.weight,
      });
    },
    onSuccess: async () => {
      setMessage("Ràng buộc phong cách viết đã được tạo.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings(selectedProfileId || "all") });
    },
  });

  const deleteBindingMutation = useMutation({
    mutationFn: (id: string) => deleteStyleBinding(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings(selectedProfileId || "all") });
    },
  });

  const testWriteMutation = useMutation({
    mutationFn: () => {
      if (!selectedProfileId) {
        throw new Error("Vui lòng chọn tài sản phong cách viết trước.");
      }
      return testWriteWithStyleProfile(selectedProfileId, {
        mode: testWriteForm.mode,
        topic: testWriteForm.topic || undefined,
        sourceText: testWriteForm.sourceText || undefined,
        targetLength: testWriteForm.targetLength,
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      });
    },
    onSuccess: (response) => setTestWriteOutput(response.data?.output ?? ""),
  });

  const detectionMutation = useMutation({
    mutationFn: () => {
      if (!selectedProfileId) {
        throw new Error("Vui lòng chọn tài sản phong cách viết trước.");
      }
      return detectStyleIssues({
        content: detectInput,
        styleProfileId: selectedProfileId,
        provider: llm.provider,
        model: llm.model,
        temperature: 0.2,
      });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) {
        throw new Error("Vui lòng chọn tài sản phong cách viết trước.");
      }
      const report = detectionMutation.data?.data ?? (await detectStyleIssues({
        content: detectInput,
        styleProfileId: selectedProfileId,
        provider: llm.provider,
        model: llm.model,
        temperature: 0.2,
      })).data;
      if (!report || report.violations.length === 0) {
        return { data: { content: detectInput } };
      }
      return rewriteStyleIssues({
        content: detectInput,
        styleProfileId: selectedProfileId,
        issues: report.violations.map((item) => ({
          ruleName: item.ruleName,
          excerpt: item.excerpt,
          suggestion: item.suggestion,
        })),
        provider: llm.provider,
        model: llm.model,
        temperature: 0.5,
      });
    },
    onSuccess: (response) => setRewritePreview(response.data?.content ?? ""),
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bộ máy phong cách viết</h1>
          <p className="text-sm text-muted-foreground">
            Hãy chọn một phong cách hoặc mẫu có sẵn để bắt đầu, rồi tinh chỉnh dần quy tắc, đối tượng ràng buộc và kết quả thử viết.
          </p>
        </div>
        <OpenInCreativeHubButton bindings={{ styleProfileId: selectedProfileId || null }} label="Gửi tài sản phong cách viết sang trung tâm sáng tác" />
      </div>

      {message ? <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{message}</div> : null}

      <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WritingFormulaSidebar
          createForm={createForm}
          onCreateFormChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
          onCreateManual={() => createManualMutation.mutate()}
          onCreateFromBrief={() => createFromBriefMutation.mutate()}
          onExtractFromText={() => createFromTextMutation.mutate()}
          onCreateFromTemplate={(templateId) => createFromTemplateMutation.mutate(templateId)}
          createManualPending={createManualMutation.isPending}
          createFromBriefPending={createFromBriefMutation.isPending}
          extractFromTextPending={createFromTextMutation.isPending}
          createFromTemplatePending={createFromTemplateMutation.isPending}
          templates={templates}
          antiAiRules={antiAiRules}
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onSelectProfile={setSelectedProfileId}
          onToggleRule={(rule, enabled) => toggleRuleMutation.mutate({ rule, enabled })}
        />

        <div className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <WritingFormulaEditorPanel
            selectedProfile={selectedProfile}
            editor={editor}
            antiAiRules={antiAiRules}
            savePending={saveProfileMutation.isPending}
            deletePending={deleteProfileMutation.isPending}
            reextractPending={reextractFeaturesMutation.isPending}
            onEditorChange={(patch) => setEditor((prev) => ({ ...prev, ...patch }))}
            onToggleExtractedFeature={(featureId, checked) => setEditor((prev) => {
              const extractedFeatures = prev.extractedFeatures.map((feature) => (
                feature.id === featureId ? { ...feature, enabled: checked } : feature
              ));
              const ruleSet = buildRuleSetFromExtractedFeatures(extractedFeatures);
              return {
                ...prev,
                extractedFeatures,
                narrativeRules: prettyJson(ruleSet.narrativeRules),
                characterRules: prettyJson(ruleSet.characterRules),
                languageRules: prettyJson(ruleSet.languageRules),
                rhythmRules: prettyJson(ruleSet.rhythmRules),
              };
            })}
            onReextractFeatures={() => reextractFeaturesMutation.mutate()}
            onToggleAntiAiRule={(ruleId, checked) => setEditor((prev) => ({
              ...prev,
              antiAiRuleIds: checked
                ? [...prev.antiAiRuleIds, ruleId]
                : prev.antiAiRuleIds.filter((item) => item !== ruleId),
            }))}
            onSave={() => saveProfileMutation.mutate()}
            onDelete={() => selectedProfile && deleteProfileMutation.mutate(selectedProfile.id)}
          />

          <WritingFormulaWorkbenchPanel
            selectedProfileId={selectedProfileId}
            bindingForm={bindingForm}
            bindings={bindings}
            novelOptions={novelOptions}
            chapterOptions={chapterOptions}
            createBindingPending={createBindingMutation.isPending}
            onBindingFormChange={(patch) => setBindingForm((prev) => ({ ...prev, ...patch }))}
            onCreateBinding={() => createBindingMutation.mutate()}
            onDeleteBinding={(bindingId) => deleteBindingMutation.mutate(bindingId)}
            testWriteForm={testWriteForm}
            testWriteOutput={testWriteOutput}
            testWritePending={testWriteMutation.isPending}
            onTestWriteFormChange={(patch) => setTestWriteForm((prev) => ({ ...prev, ...patch }))}
            onRunTestWrite={() => testWriteMutation.mutate()}
            detectInput={detectInput}
            detectionReport={detectionMutation.data?.data ?? null}
            detectionPending={detectionMutation.isPending}
            rewritePending={rewriteMutation.isPending}
            rewritePreview={rewritePreview}
            onDetectInputChange={setDetectInput}
            onDetect={() => detectionMutation.mutate()}
            onRewrite={() => rewriteMutation.mutate()}
          />
        </div>
      </div>
    </div>
  );
}
