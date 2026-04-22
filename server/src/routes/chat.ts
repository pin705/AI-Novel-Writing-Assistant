import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseMessageChunk } from "@langchain/core/messages";
import { z } from "zod";
import { agentRuntime } from "../agents";
import { getBackendLanguage, getBackendMessage, translateBackendText } from "../i18n";
import { createLLMFromResolvedOptions, resolveLLMClientOptions } from "../llm/factory";
import { llmProviderSchema } from "../llm/providerSchema";
import {
  ThinkTagStreamFilter,
  diffAccumulatedText,
  extractMiniMaxRawStreamData,
  extractReasoningTextFromChunk,
  isMiniMaxCompatibleProvider,
} from "../llm/reasoning";
import { initSSE, writeSSEFrame } from "../llm/streaming";
import { authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { ragServices } from "../services/rag";
import type { RagOwnerType } from "../services/rag/types";

const router = Router();

const approvalResponseSchema = z.object({
  approvalId: z.string().trim().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(2000).optional(),
});

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().min(1),
      }),
    )
    .min(1),
  systemPrompt: z.string().optional(),
  agentMode: z.boolean().optional(),
  provider: llmProviderSchema.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(64).max(16384).optional(),
  enableSearch: z.boolean().optional(),
  enableRag: z.boolean().optional(),
  chatMode: z.enum(["standard", "agent"]).optional(),
  contextMode: z.enum(["global", "novel"]).optional(),
  sessionId: z.string().trim().optional(),
  runId: z.string().trim().optional(),
  approvalResponse: approvalResponseSchema.optional(),
  contextScope: z.enum(["novel", "world", "global"]).optional(),
  novelId: z.string().trim().optional(),
  worldId: z.string().trim().optional(),
  knowledgeDocumentIds: z.array(z.string().trim().min(1)).optional(),
});

router.use(authMiddleware);

function chunkToText(content: BaseMessageChunk["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

function buildDefaultSystemPrompt(): string {
  const language = getBackendLanguage();
  if (language === "en") {
    return `You are a professional novel-writing assistant who helps authors with story development, worldbuilding, and character design.
- Organize responses with Markdown
- Give concrete, actionable advice
- Combine literary craft with commercial-writing practice
- Strong areas: writing technique / plot development / character design / worldbuilding / style guidance / creative block resolution`;
  }
  if (language === "zh") {
    return `你是一位专业的小说创作助手，擅长帮助作者进行小说创作、世界设定、角色设计等工作。
- 使用 Markdown 格式组织回答
- 提供具体、可操作的创作建议
- 结合文学理论与商业写作实践
- 擅长领域：写作技巧/情节构思/角色设计/世界观构建/文风建议/创作瓶颈突破`;
  }
  return `Bạn là trợ lý sáng tác tiểu thuyết chuyên nghiệp, hỗ trợ tác giả phát triển truyện, xây dựng thế giới và thiết kế nhân vật.
- Trình bày câu trả lời bằng Markdown
- Đưa ra gợi ý cụ thể, có thể làm ngay
- Kết hợp kỹ thuật viết với thực hành viết thương mại
- Thế mạnh: kỹ thuật viết / phát triển cốt truyện / thiết kế nhân vật / xây dựng thế giới / gợi ý văn phong / tháo gỡ bế tắc sáng tác`;
}

function buildAgentModePrompt(systemPrompt: string): string {
  const language = getBackendLanguage();
  if (language === "en") {
    return `${systemPrompt}

As an intelligent creative agent, you should:
- analyze the deeper problem behind the user's request
- offer multiple solution paths and compare tradeoffs
- recommend concrete next actions
- ask focused follow-up questions only when necessary`;
  }
  if (language === "zh") {
    return `${systemPrompt}

作为智能创作代理，你需要：
- 主动分析用户需求背后的深层问题
- 提供多个解决方案并分析各自优劣
- 给出具体的下一步行动建议
- 仅在必要时提出聚焦问题以补足信息`;
  }
  return `${systemPrompt}

Với vai trò tác tử sáng tác thông minh, bạn cần:
- chủ động phân tích vấn đề cốt lõi phía sau yêu cầu của người dùng
- đưa ra nhiều hướng giải quyết và so sánh ưu nhược điểm
- đề xuất bước hành động tiếp theo thật cụ thể
- chỉ hỏi thêm khi thực sự cần để lấp phần thông tin còn thiếu`;
}

function buildSearchHint(): string {
  const language = getBackendLanguage();
  if (language === "en") {
    return "\nNote: web search is currently reserved; state clearly when you are inferring from the existing context.";
  }
  if (language === "zh") {
    return "\n提示：联网检索能力当前为预留状态，请在回答中明确说明哪些内容是基于现有上下文推断。";
  }
  return "\nLưu ý: tính năng tìm kiếm web hiện mới ở trạng thái dự phòng; hãy nói rõ phần nào đang được suy luận từ ngữ cảnh hiện có.";
}

function buildRagHint(ragContext: string): string {
  const language = getBackendLanguage();
  if (language === "en") {
    return `\nBelow are retrieved knowledge snippets (which may be incomplete). Prioritize them in your answer and explicitly note uncertainty when there are conflicts:\n${ragContext}\n`;
  }
  if (language === "zh") {
    return `\n以下是检索到的项目知识片段（可能不完整），请优先依据这些内容回答，并在冲突时说明不确定性：\n${ragContext}\n`;
  }
  return `\nDưới đây là các trích đoạn tri thức đã truy hồi được từ dự án (có thể chưa đầy đủ). Hãy ưu tiên dựa vào các nội dung này để trả lời, và nếu có mâu thuẫn thì phải nêu rõ phần chưa chắc chắn:\n${ragContext}\n`;
}

router.post("/", validate({ body: chatSchema }), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof chatSchema>;
    const shouldUseAgentMode = body.chatMode === "agent" || body.agentMode === true;
    if (shouldUseAgentMode) {
      const disposeHeartbeat = initSSE(res);
      let fullContent = "";
      const callbacks = {
        onReasoning: (content: string) => writeSSEFrame(res, { type: "reasoning", content }),
        onToolCall: (payload: { runId: string; stepId: string; toolName: string; inputSummary: string }) =>
          writeSSEFrame(res, { type: "tool_call", ...payload }),
        onToolResult: (payload: {
          runId: string;
          stepId: string;
          toolName: string;
          outputSummary: string;
          success: boolean;
        }) => writeSSEFrame(res, { type: "tool_result", ...payload }),
        onApprovalRequired: (payload: {
          runId: string;
          approvalId: string;
          summary: string;
          targetType: string;
          targetId: string;
        }) => writeSSEFrame(res, { type: "approval_required", ...payload }),
        onApprovalResolved: (payload: { runId: string; approvalId: string; action: "approved" | "rejected"; note?: string }) =>
          writeSSEFrame(res, { type: "approval_resolved", ...payload }),
        onRunStatus: (payload: {
          runId: string;
          status: "queued" | "running" | "waiting_approval" | "succeeded" | "failed" | "cancelled";
          message?: string;
        }) => writeSSEFrame(res, { type: "run_status", ...payload }),
      };
      try {
        const latestUserMessage = [...body.messages].reverse().find((item) => item.role === "user")?.content?.trim();
        const contextMode = body.contextMode ?? (body.novelId ? "novel" : "global");
        if (contextMode === "novel" && !body.novelId) {
          throw new AppError("chat.error.novel_context_requires_novel_id", 400);
        }
        if (body.approvalResponse && !body.runId) {
          throw new AppError("chat.error.approval_requires_run_id", 400);
        }
        const result = body.approvalResponse && body.runId
          ? await agentRuntime.resolveApproval({
            runId: body.runId,
            approvalId: body.approvalResponse.approvalId,
            action: body.approvalResponse.action,
            note: body.approvalResponse.note,
          }, callbacks)
          : await agentRuntime.start({
            runId: body.runId,
            sessionId: body.sessionId?.trim() || `chat_session_${Date.now()}`,
            goal: latestUserMessage ?? getBackendMessage("chat.route.agent.goal_fallback"),
            messages: body.messages.slice(-20),
            contextMode,
            novelId: contextMode === "novel" ? body.novelId : undefined,
            provider: body.provider,
            model: body.model,
            temperature: body.temperature,
            maxTokens: body.maxTokens,
          }, callbacks);
        fullContent = result.assistantOutput.trim();
        if (fullContent) {
          writeSSEFrame(res, { type: "chunk", content: fullContent });
        }
        writeSSEFrame(res, { type: "done", fullContent });
      } catch (error) {
        writeSSEFrame(res, {
          type: "error",
          error: translateBackendText(error instanceof Error ? error.message : "chat.error.agent_run_failed"),
        });
      } finally {
        disposeHeartbeat();
        if (!res.writableEnded) {
          res.end();
        }
      }
      return;
    }

    const resolvedLLM = await resolveLLMClientOptions(body.provider ?? "deepseek", {
      model: body.model,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.maxTokens,
    });
    const llm = createLLMFromResolvedOptions(resolvedLLM);

    const recentMessages = body.messages.slice(-20);
    const systemPrompt =
      body.systemPrompt ??
      buildDefaultSystemPrompt();

    const finalSystemPrompt =
      body.agentMode
        ? buildAgentModePrompt(systemPrompt)
        : systemPrompt;

    const searchHint = body.enableSearch
      ? buildSearchHint()
      : "";

    const latestUserMessage = [...recentMessages]
      .reverse()
      .find((item) => item.role === "user")
      ?.content
      ?.trim();
    const shouldEnableRag = body.enableRag
      ?? (Array.isArray(body.knowledgeDocumentIds) && body.knowledgeDocumentIds.length > 0);
    const scope = body.contextScope ?? "global";
    const ownerTypes: RagOwnerType[] | undefined = scope === "novel"
      ? ["novel", "chapter", "bible", "chapter_summary", "consistency_fact", "character", "character_timeline"]
      : scope === "world"
        ? ["world", "world_library_item"]
        : undefined;
    let ragContext = "";
    if (shouldEnableRag && latestUserMessage) {
      try {
        ragContext = await ragServices.hybridRetrievalService.buildContextBlock(latestUserMessage, {
          novelId: scope === "novel" ? body.novelId : undefined,
          worldId: scope === "world" ? body.worldId : undefined,
          ownerTypes,
          knowledgeDocumentIds: body.knowledgeDocumentIds,
        });
      } catch {
        ragContext = "";
      }
    }
    const ragHint = ragContext
      ? buildRagHint(ragContext)
      : "";

    const messages = [
      new SystemMessage(finalSystemPrompt + searchHint + ragHint),
      ...recentMessages.map((item) => {
        if (item.role === "assistant") {
          return new AIMessage(item.content);
        }
        if (item.role === "system") {
          return new SystemMessage(item.content);
        }
        return new HumanMessage(item.content);
      }),
    ];

    const stream = await llm.stream(messages);
    const disposeHeartbeat = initSSE(res);
    let fullContent = "";
    const isMiniMaxStream = isMiniMaxCompatibleProvider(
      resolvedLLM.provider,
      resolvedLLM.baseURL,
      resolvedLLM.model,
    );
    const thinkFilter = isMiniMaxStream ? new ThinkTagStreamFilter() : null;
    let miniMaxContentBuffer = "";
    let miniMaxReasoningBuffer = "";

    try {
      for await (const chunk of stream) {
        if (res.writableEnded) {
          break;
        }

        let reasoningContent = "";
        let text = chunkToText(chunk.content);

        if (isMiniMaxStream) {
          const rawResponse = (chunk.additional_kwargs as { __raw_response?: unknown } | undefined)
            ?.__raw_response;
          const rawStreamData = extractMiniMaxRawStreamData(rawResponse);

          const normalizedContent = diffAccumulatedText(miniMaxContentBuffer, rawStreamData.contentBuffer);
          miniMaxContentBuffer = normalizedContent.nextBuffer;
          if (normalizedContent.delta) {
            text = normalizedContent.delta;
          }

          const normalizedReasoning = diffAccumulatedText(miniMaxReasoningBuffer, rawStreamData.reasoningBuffer);
          miniMaxReasoningBuffer = normalizedReasoning.nextBuffer;
          reasoningContent = normalizedReasoning.delta;
        }

        if (!reasoningContent) {
          reasoningContent = extractReasoningTextFromChunk(chunk);
        }
        if (reasoningContent && resolvedLLM.reasoningEnabled) {
          writeSSEFrame(res, { type: "reasoning", content: reasoningContent });
        }

        const filteredChunk = thinkFilter ? thinkFilter.push(text) : { text, reasoning: "" };
        if (filteredChunk.reasoning && resolvedLLM.reasoningEnabled) {
          writeSSEFrame(res, { type: "reasoning", content: filteredChunk.reasoning });
        }

        if (!filteredChunk.text) {
          continue;
        }
        fullContent += filteredChunk.text;
        writeSSEFrame(res, { type: "chunk", content: filteredChunk.text });
      }

      if (thinkFilter) {
        const flushedChunk = thinkFilter.flush();
        if (flushedChunk.reasoning && resolvedLLM.reasoningEnabled) {
          writeSSEFrame(res, { type: "reasoning", content: flushedChunk.reasoning });
        }
        if (flushedChunk.text) {
          fullContent += flushedChunk.text;
          writeSSEFrame(res, { type: "chunk", content: flushedChunk.text });
        }
      }

      writeSSEFrame(res, { type: "done", fullContent });
    } catch (error) {
      writeSSEFrame(res, {
        type: "error",
        error: translateBackendText(error instanceof Error ? error.message : "chat.error.stream_failed"),
      });
    } finally {
      disposeHeartbeat();
      if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (error) {
    next(error);
  }
});

router.get("/history", (_req, res) => {
  res.status(200).json({
    success: true,
    data: [],
    message: getBackendMessage("chat.route.history.empty"),
  } satisfies ApiResponse<unknown[]>);
});

export default router;
