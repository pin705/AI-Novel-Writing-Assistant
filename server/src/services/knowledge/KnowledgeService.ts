import type {
  KnowledgeBindingTargetType,
  KnowledgeDocumentStatus,
  KnowledgeRecallTestResult,
} from "@ai-novel/shared/types/knowledge";
import { getBackendMessage } from "../../i18n";
import { prisma } from "../../db/prisma";
import { ragServices } from "../rag";
import {
  buildKnowledgeContentHash,
  normalizeKnowledgeContent,
  normalizeKnowledgeDocumentTitle,
} from "./common";

export class KnowledgeService {
  private getIndexFailureFallback(): string {
    return getBackendMessage("knowledge.index.failure.check_tasks");
  }

  private async loadLatestFailedIndexErrors(documentIds: string[]): Promise<Map<string, string | null>> {
    if (documentIds.length === 0) {
      return new Map();
    }

    const rows = await prisma.ragIndexJob.findMany({
      where: {
        ownerType: "knowledge_document",
        ownerId: { in: documentIds },
        status: "failed",
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        ownerId: true,
        lastError: true,
      },
    });

    const errorMap = new Map<string, string | null>();
    for (const row of rows) {
      if (!errorMap.has(row.ownerId)) {
        errorMap.set(row.ownerId, row.lastError ?? this.getIndexFailureFallback());
      }
    }
    return errorMap;
  }

  private queueKnowledgeRebuild(documentId: string): void {
    void ragServices.ragIndexService.enqueueOwnerJob("rebuild", "knowledge_document", documentId).catch(() => {
      // Keep knowledge document CRUD resilient even if reindex queueing fails.
    });
  }

  private queueKnowledgeDelete(documentId: string): void {
    void ragServices.ragIndexService.enqueueOwnerJob("delete", "knowledge_document", documentId).catch(() => {
      // Keep knowledge document CRUD resilient even if delete queueing fails.
    });
  }

  private async assertTargetExists(targetType: KnowledgeBindingTargetType, targetId: string): Promise<void> {
    if (targetType === "novel") {
      const exists = await prisma.novel.count({ where: { id: targetId } });
      if (!exists) {
        throw new Error(getBackendMessage("knowledge.error.target_novel_not_found"));
      }
      return;
    }
    const exists = await prisma.world.count({ where: { id: targetId } });
    if (!exists) {
      throw new Error(getBackendMessage("knowledge.error.target_world_not_found"));
    }
  }

  async listDocuments(filters: {
    keyword?: string;
    status?: KnowledgeDocumentStatus;
  } = {}) {
    const keyword = filters.keyword?.trim();
    const rows = await prisma.knowledgeDocument.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : { status: { not: "archived" } }),
        ...(keyword
          ? {
            OR: [
              { title: { contains: keyword } },
              { fileName: { contains: keyword } },
            ],
          }
          : {}),
      },
      include: {
        _count: {
          select: {
            versions: true,
            bookAnalyses: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    const failedIndexErrors = await this.loadLatestFailedIndexErrors(rows.map((item) => item.id));

    return rows.map((item) => ({
      id: item.id,
      title: item.title,
      fileName: item.fileName,
      status: item.status,
      activeVersionId: item.activeVersionId,
      activeVersionNumber: item.activeVersionNumber,
      latestIndexStatus: item.latestIndexStatus,
      latestIndexError:
        item.latestIndexStatus === "failed"
          ? (failedIndexErrors.get(item.id) ?? this.getIndexFailureFallback())
          : null,
      lastIndexedAt: item.lastIndexedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      versionCount: item._count.versions,
      bookAnalysisCount: item._count.bookAnalyses,
    }));
  }

  async getDocumentById(documentId: string) {
    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      include: {
      versions: {
          orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
        },
        _count: {
          select: {
            bookAnalyses: true,
          },
        },
      },
    });
    if (!document) {
      return null;
    }
    const failedIndexError = document.latestIndexStatus === "failed"
      ? await prisma.ragIndexJob.findFirst({
        where: {
          ownerType: "knowledge_document",
          ownerId: document.id,
          status: "failed",
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: { lastError: true },
      })
      : null;

    return {
      id: document.id,
      title: document.title,
      fileName: document.fileName,
      status: document.status,
      activeVersionId: document.activeVersionId,
      activeVersionNumber: document.activeVersionNumber,
      latestIndexStatus: document.latestIndexStatus,
      latestIndexError:
        document.latestIndexStatus === "failed"
          ? (failedIndexError?.lastError ?? this.getIndexFailureFallback())
          : null,
      lastIndexedAt: document.lastIndexedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      bookAnalysisCount: document._count.bookAnalyses,
      versions: document.versions.map((version) => ({
        id: version.id,
        documentId: version.documentId,
        versionNumber: version.versionNumber,
        content: version.content,
        contentHash: version.contentHash,
        charCount: version.charCount,
        createdAt: version.createdAt,
        isActive: version.id === document.activeVersionId,
      })),
    };
  }

  async createDocument(input: {
    title?: string;
    fileName: string;
    content: string;
  }) {
    const normalizedContent = normalizeKnowledgeContent(input.content);
    const title = normalizeKnowledgeDocumentTitle(input.title, input.fileName);
    const contentHash = buildKnowledgeContentHash(normalizedContent);

    const document = await prisma.$transaction(async (tx) => {
      const existing = await tx.knowledgeDocument.findFirst({
        where: {
          title,
          status: { not: "archived" },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (existing) {
        const nextVersionNumber = existing.activeVersionNumber + 1;
        const version = await tx.knowledgeDocumentVersion.create({
          data: {
            documentId: existing.id,
            versionNumber: nextVersionNumber,
            content: normalizedContent,
            contentHash,
            charCount: normalizedContent.length,
          },
        });
        return tx.knowledgeDocument.update({
          where: { id: existing.id },
          data: {
            fileName: input.fileName.trim(),
            activeVersionId: version.id,
            activeVersionNumber: nextVersionNumber,
            latestIndexStatus: "queued",
          },
          include: {
            versions: {
              orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
            },
          },
        });
      }

      const created = await tx.knowledgeDocument.create({
        data: {
          title,
          fileName: input.fileName.trim(),
          status: "enabled",
          latestIndexStatus: "queued",
        },
      });
      const version = await tx.knowledgeDocumentVersion.create({
        data: {
          documentId: created.id,
          versionNumber: 1,
          content: normalizedContent,
          contentHash,
          charCount: normalizedContent.length,
        },
      });
      return tx.knowledgeDocument.update({
        where: { id: created.id },
        data: {
          activeVersionId: version.id,
          activeVersionNumber: 1,
        },
        include: {
          versions: {
            orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
          },
        },
      });
    });

    this.queueKnowledgeRebuild(document.id);
    const detail = await this.getDocumentById(document.id);
    if (!detail) {
      throw new Error(getBackendMessage("knowledge.error.document_not_found_after_creation"));
    }
    return detail;
  }

  async createDocumentVersion(documentId: string, input: {
    fileName?: string;
    content: string;
  }) {
    const normalizedContent = normalizeKnowledgeContent(input.content);
    const contentHash = buildKnowledgeContentHash(normalizedContent);

    const document = await prisma.$transaction(async (tx) => {
      const existing = await tx.knowledgeDocument.findUnique({
        where: { id: documentId },
      });
      if (!existing) {
        throw new Error(getBackendMessage("task.error.knowledge.document_not_found"));
      }
      if (existing.status === "archived") {
        throw new Error(getBackendMessage("knowledge.error.archived_no_new_versions"));
      }
      const nextVersionNumber = existing.activeVersionNumber + 1;
      const version = await tx.knowledgeDocumentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          content: normalizedContent,
          contentHash,
          charCount: normalizedContent.length,
        },
      });
      return tx.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          fileName: input.fileName?.trim() || existing.fileName,
          activeVersionId: version.id,
          activeVersionNumber: nextVersionNumber,
          latestIndexStatus: "queued",
        },
        include: {
          versions: {
            orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
          },
        },
      });
    });

    this.queueKnowledgeRebuild(document.id);
    const detail = await this.getDocumentById(document.id);
    if (!detail) {
      throw new Error(getBackendMessage("knowledge.error.document_not_found_after_version_creation"));
    }
    return detail;
  }

  async activateVersion(documentId: string, versionId: string) {
    const document = await prisma.$transaction(async (tx) => {
      const version = await tx.knowledgeDocumentVersion.findFirst({
        where: {
          id: versionId,
          documentId,
        },
      });
      if (!version) {
        throw new Error(getBackendMessage("knowledge.error.version_not_found"));
      }
      return tx.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          activeVersionId: version.id,
          activeVersionNumber: version.versionNumber,
          latestIndexStatus: "queued",
        },
        include: {
          versions: {
            orderBy: [{ versionNumber: "desc" }, { createdAt: "desc" }],
          },
        },
      });
    });

    this.queueKnowledgeRebuild(document.id);
    const detail = await this.getDocumentById(document.id);
    if (!detail) {
      throw new Error(getBackendMessage("knowledge.error.document_not_found_after_version_activation"));
    }
    return detail;
  }

  async reindexDocument(documentId: string) {
    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new Error(getBackendMessage("task.error.knowledge.document_not_found"));
    }
    if (!document.activeVersionId) {
      throw new Error(getBackendMessage("knowledge.error.no_active_version"));
    }
    const updated = await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        latestIndexStatus: "queued",
      },
    });
    this.queueKnowledgeRebuild(documentId);
    return updated;
  }

  async updateDocumentStatus(documentId: string, status: KnowledgeDocumentStatus) {
    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new Error(getBackendMessage("task.error.knowledge.document_not_found"));
    }
    const updated = await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        status,
        ...(status === "archived" ? { latestIndexStatus: "idle" } : {}),
      },
    });
    if (status === "archived") {
      this.queueKnowledgeDelete(documentId);
    }
    return updated;
  }

  async testDocumentRecall(documentId: string, query: string, limit = 6): Promise<KnowledgeRecallTestResult> {
    const document = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new Error(getBackendMessage("task.error.knowledge.document_not_found"));
    }
    if (document.status === "archived") {
      throw new Error(getBackendMessage("knowledge.error.archived_no_recall_test"));
    }
    if (document.latestIndexStatus !== "succeeded") {
      throw new Error(getBackendMessage("knowledge.error.recall_requires_index_success"));
    }

    const hits = await ragServices.hybridRetrievalService.retrieve(query, {
      ownerTypes: ["knowledge_document"],
      knowledgeDocumentIds: [documentId],
      finalTopK: limit,
      vectorCandidates: Math.max(limit * 2, 10),
      keywordCandidates: Math.max(limit * 2, 10),
    });

    return {
      documentId,
      query,
      hits: hits.map((item) => ({
        id: item.id,
        ownerId: item.ownerId,
        score: item.score,
        source: item.source,
        title: item.title,
        chunkText: item.chunkText,
        chunkOrder: item.chunkOrder,
      })),
    };
  }

  async listBindings(targetType: KnowledgeBindingTargetType, targetId: string) {
    await this.assertTargetExists(targetType, targetId);
    const bindings = await prisma.knowledgeBinding.findMany({
      where: {
        targetType,
        targetId,
      },
      include: {
        document: {
          include: {
            _count: {
              select: { versions: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });
    return bindings.map((item) => ({
      ...item.document,
      versionCount: item.document._count.versions,
    }));
  }

  async replaceBindings(
    targetType: KnowledgeBindingTargetType,
    targetId: string,
    documentIds: string[],
  ) {
    await this.assertTargetExists(targetType, targetId);
    const uniqueDocumentIds = Array.from(new Set(documentIds.map((item) => item.trim()).filter(Boolean)));
    if (uniqueDocumentIds.length > 0) {
      const documents = await prisma.knowledgeDocument.findMany({
        where: {
          id: { in: uniqueDocumentIds },
          status: { not: "archived" },
        },
        select: { id: true },
      });
      if (documents.length !== uniqueDocumentIds.length) {
        throw new Error(getBackendMessage("knowledge.error.some_documents_missing_or_archived"));
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeBinding.deleteMany({
        where: {
          targetType,
          targetId,
        },
      });
      if (uniqueDocumentIds.length > 0) {
        await tx.knowledgeBinding.createMany({
          data: uniqueDocumentIds.map((documentId) => ({
            targetType,
            targetId,
            documentId,
          })),
        });
      }
    });

    return this.listBindings(targetType, targetId);
  }
}
