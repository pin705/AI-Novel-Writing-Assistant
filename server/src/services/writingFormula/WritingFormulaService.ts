import type { BaseMessageChunk } from "@langchain/core/messages";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { prisma } from "../../db/prisma";
import { getBackendMessage } from "../../i18n";
import { getLLM } from "../../llm/factory";

interface ExtractFormulaInput {
  name: string;
  sourceText: string;
  extractLevel: "basic" | "standard" | "deep";
  focusAreas: string[];
  provider?: LLMProvider;
  model?: string;
}

interface ApplyFormulaInput {
  formulaId?: string;
  formulaContent?: string;
  mode: "rewrite" | "generate";
  sourceText?: string;
  topic?: string;
  targetLength?: number;
  provider?: LLMProvider;
  model?: string;
}

function pickSection(content: string, heading: string): string | undefined {
  const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##\\s|$)`, "i");
  const matched = content.match(regex)?.[0];
  if (!matched) {
    return undefined;
  }
  return matched.replace(new RegExp(`##\\s*${heading}`, "i"), "").trim();
}

export class WritingFormulaService {
  async listFormulas() {
    return prisma.writingFormula.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  async getFormulaById(id: string) {
    return prisma.writingFormula.findUnique({
      where: { id },
    });
  }

  async deleteFormula(id: string) {
    await prisma.writingFormula.delete({
      where: { id },
    });
  }

  async createExtractStream(input: ExtractFormulaInput) {
    const headings = {
      style: getBackendMessage("writingFormula.heading.style"),
      coreTechniques: getBackendMessage("writingFormula.heading.coreTechniques"),
      formula: getBackendMessage("writingFormula.heading.formula"),
      application: getBackendMessage("writingFormula.heading.application"),
    };
    const llm = await getLLM(input.provider ?? "deepseek", {
      model: input.model,
      temperature: 0.6,
    });

    const stream = await llm.stream([
      new SystemMessage(
        getBackendMessage("writingFormula.prompt.extract.system", {
          extractLevel: input.extractLevel,
          focusAreas: input.focusAreas.join(", "),
          styleHeading: headings.style,
          coreTechniquesHeading: headings.coreTechniques,
          formulaHeading: headings.formula,
          applicationHeading: headings.application,
        }),
      ),
      new HumanMessage(input.sourceText),
    ]);

    return {
      stream: stream as AsyncIterable<BaseMessageChunk>,
      onDone: async (fullContent: string) => {
        await prisma.writingFormula.create({
          data: {
            name: input.name,
            sourceText: input.sourceText,
            content: fullContent,
            style: pickSection(fullContent, headings.style),
            formulaDescription: pickSection(fullContent, headings.coreTechniques),
            formulaSteps: pickSection(fullContent, headings.formula),
            applicationTips: pickSection(fullContent, headings.application),
          },
        });
      },
    };
  }

  async createApplyStream(input: ApplyFormulaInput) {
    const llm = await getLLM(input.provider ?? "deepseek", {
      model: input.model,
      temperature: 0.7,
    });

    const formulaContent =
      input.formulaContent ??
      (input.formulaId
        ? (await prisma.writingFormula.findUnique({ where: { id: input.formulaId } }))?.content
        : undefined);

    if (!formulaContent) {
      throw new Error(getBackendMessage("writingFormula.error.formulaContentMissing"));
    }

    if (input.mode === "rewrite") {
      if (!input.sourceText) {
        throw new Error(getBackendMessage("writingFormula.error.rewriteRequiresSourceText"));
      }
      const stream = await llm.stream([
        new SystemMessage(
          getBackendMessage("writingFormula.prompt.rewrite.system"),
        ),
        new HumanMessage(getBackendMessage("writingFormula.prompt.rewrite.human", {
          formulaContent,
          sourceText: input.sourceText,
        })),
      ]);
      return {
        stream: stream as AsyncIterable<BaseMessageChunk>,
      };
    }

    if (!input.topic) {
      throw new Error(getBackendMessage("writingFormula.error.generateRequiresTopic"));
    }
    const targetLength = input.targetLength ?? 1200;
    const stream = await llm.stream([
      new SystemMessage(
        getBackendMessage("writingFormula.prompt.generate.system", {
          targetLength,
        }),
      ),
      new HumanMessage(getBackendMessage("writingFormula.prompt.generate.human", {
        formulaContent,
        topic: input.topic,
      })),
    ]);
    return {
      stream: stream as AsyncIterable<BaseMessageChunk>,
    };
  }
}
