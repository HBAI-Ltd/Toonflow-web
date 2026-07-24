import axios from "@/utils/axios";
import type {
  ApiEnvelope,
  ChapterFactDetail,
  ChapterVersionRow,
  PagedBatches,
  PagedChapterFacts,
  PagedSemanticObjects,
  PagedSourceChapters,
  PagedSourceIssues,
  SemanticObjectDetail,
  SourceFoundationOverview,
} from "@/types/sourceFoundation";

async function request<T>(config: Parameters<typeof axios.request>[0]): Promise<T> {
  const response = (await axios.request(config)) as ApiEnvelope<T>;
  return response.data;
}

export const sourceFoundationApi = {
  overview: (projectId: number) =>
    request<SourceFoundationOverview>({ method: "GET", url: "/sourceFoundation/overview", params: { projectId } }),

  // ---- Chapters (Step 1) ----
  chapters: (params: { projectId: number; page: number; pageSize: number }) =>
    request<PagedSourceChapters>({ method: "GET", url: "/sourceFoundation/chapters", params }),
  importChapters: (data: { projectId: number; chapters: Array<{ reel: string; chapter: string; chapterData: string }> }) =>
    request<{ rows: unknown[] }>({ method: "POST", url: "/sourceFoundation/chapters/import", data }),
  chapterVersions: (novelId: number, projectId: number) =>
    request<ChapterVersionRow[]>({ method: "GET", url: `/sourceFoundation/chapters/${novelId}/versions`, params: { projectId } }),
  chapterRevision: (
    novelId: number,
    data: { projectId: number; expectedVersionId: string; reel: string; chapter: string; chapterData: string },
  ) =>
    request<{ versionId: string; version: number }>({
      method: "POST",
      url: `/sourceFoundation/chapters/${novelId}/revisions`,
      data,
    }),

  // ---- Batches (Step 1) ----
  batches: (params: { projectId: number; page: number; pageSize: number; includeArchived?: boolean }) =>
    request<PagedBatches>({ method: "GET", url: "/sourceFoundation/batches", params }),
  batch: (id: string, projectId: number) =>
    request<import("@/types/sourceFoundation").BatchDetail>({
      method: "GET",
      url: `/sourceFoundation/batches/${id}`,
      params: { projectId },
    }),
  batchCreate: (data: { projectId: number; startChapterIndex: number; endChapterIndex: number }) =>
    request<{ batchId: string }>({ method: "POST", url: "/sourceFoundation/batches", data }),
  batchCommand: (id: string, command: "start" | "resume" | "retry-failed" | "cancel", projectId: number) =>
    request<{ batchId: string }>({ method: "POST", url: `/sourceFoundation/batches/${id}/${command}`, data: { projectId } }),

  // ---- Facts (Step 2) ----
  facts: (params: { projectId: number; page: number; pageSize: number }) =>
    request<PagedChapterFacts>({ method: "GET", url: "/sourceFoundation/facts", params }),
  factDetail: (factVersionId: string, projectId: number) =>
    request<ChapterFactDetail>({ method: "GET", url: `/sourceFoundation/facts/${factVersionId}`, params: { projectId } }),
  factRevision: (
    factVersionId: string,
    data: {
      projectId: number;
      expectedFactVersionId: string;
      expectedHeadRowVersion: number;
      payload: Record<string, unknown>;
    },
  ) =>
    request<{ factVersionId: string; version: number }>({
      method: "POST",
      url: `/sourceFoundation/facts/${factVersionId}/revisions`,
      data,
    }),

  // ---- Semantic objects (Step 2) ----
  semanticObjects: (params: {
    projectId: number;
    page: number;
    pageSize: number;
    kind?: "entity" | "term";
    status?: string;
  }) => request<PagedSemanticObjects>({ method: "GET", url: "/sourceFoundation/semantic-objects", params }),
  semanticDetail: (semanticObjectId: string, projectId: number) =>
    request<SemanticObjectDetail>({
      method: "GET",
      url: `/sourceFoundation/semantic-objects/${semanticObjectId}`,
      params: { projectId },
    }),
  semanticRevision: (
    semanticObjectId: string,
    data: {
      projectId: number;
      expectedRevisionId: string;
      canonicalName: string;
      aliases?: string[];
      stableTraits?: unknown;
      genrePayload?: unknown;
      evidence?: unknown;
    },
  ) =>
    request<{ revisionId: string; version: number }>({
      method: "POST",
      url: `/sourceFoundation/semantic-objects/${semanticObjectId}/revisions`,
      data,
    }),
  decideMention: (
    bindingId: string,
    data: {
      projectId: number;
      expectedVersion: number;
      decision: "confirmed" | "rejected";
      reason: string;
      semanticObjectId?: string;
    },
  ) => request<null>({ method: "POST", url: `/sourceFoundation/mention-bindings/${bindingId}/decide`, data }),
  decideRelation: (
    relationId: string,
    data: { projectId: number; expectedVersion: number; decision: "confirmed" | "rejected"; reason: string },
  ) => request<null>({ method: "POST", url: `/sourceFoundation/fact-relations/${relationId}/decide`, data }),

  // ---- Issues (Step 2) ----
  issues: (params: {
    projectId: number;
    page: number;
    pageSize: number;
    status?: string;
    severity?: "blocker" | "confirm" | "warning";
  }) => request<PagedSourceIssues>({ method: "GET", url: "/sourceFoundation/issues", params }),
  decideIssue: (
    issueId: string,
    data: { projectId: number; decision: "resolved" | "accepted" | "dismissed"; reason: string },
  ) => request<null>({ method: "POST", url: `/sourceFoundation/issues/${issueId}/decide`, data }),
};
