import axios from "@/utils/axios";
import type {
  ApiEnvelope,
  ApprovalRecord,
  ArtifactVersion,
  EpisodeListResponse,
  GenerateCommandResult,
  PagedResult,
  Stage2Audit,
  Stage2EpisodeDetail,
  Stage2Issue,
  Stage2Task,
  VoiceScriptVersion,
} from "@/types/screenplayPipeline";

async function request<T>(config: Parameters<typeof axios.request>[0]): Promise<T> {
  const response = (await axios.request(config)) as ApiEnvelope<T>;
  return response.data;
}

export const screenplayPipelineApi = {
  // ---- Episodes ----
  listEpisodes: (params: { projectId: number; page: number; pageSize: number }) =>
    request<EpisodeListResponse>({ method: "GET", url: "/screenplayPipeline/episodes", params }),
  episodeDetail: (episodeId: string, projectId: number) =>
    request<Stage2EpisodeDetail>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}`,
      params: { projectId },
    }),
  createEpisode: (data: { projectId: number; sourcePackageId: string }) =>
    request<{ id: string }>({ method: "POST", url: "/screenplayPipeline/episodes", data }),
  adoptSourcePackage: (episodeId: string, data: { projectId: number; sourcePackageId: string }) =>
    request<null>({ method: "POST", url: `/screenplayPipeline/episodes/${episodeId}/adopt-source-package`, data }),

  // ---- Adaptation ----
  generateAdaptation: (episodeId: string, data: { projectId: number; expectedRowVersion: number; reason?: string }) =>
    request<GenerateCommandResult>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/generate-adaptation`,
      data,
    }),
  markUnadaptable: (episodeId: string, data: { projectId: number; reason: string }) =>
    request<null>({ method: "POST", url: `/screenplayPipeline/episodes/${episodeId}/mark-unadaptable`, data }),

  // ---- Screenplay ----
  generateScreenplay: (
    episodeId: string,
    data: { projectId: number; adaptationDesignVersionId: string; expectedRowVersion: number; reason?: string },
  ) =>
    request<GenerateCommandResult>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/generate-screenplay`,
      data,
    }),
  reviseScreenplay: (
    episodeId: string,
    data: {
      projectId: number;
      screenplayVersionId: string;
      payload: unknown;
      expectedRowVersion: number;
      reason: string;
    },
  ) =>
    request<{ screenplayVersionId: string }>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/revise-screenplay`,
      data,
    }),
  regenerateScreenplay: (
    episodeId: string,
    data: {
      projectId: number;
      adaptationDesignVersionId: string;
      reason: string;
      expectedRowVersion: number;
      subjectKind?: "content" | "audit";
    },
  ) =>
    request<GenerateCommandResult>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/regenerate-screenplay`,
      data,
    }),
  confirmScreenplay: (
    episodeId: string,
    data: {
      projectId: number;
      adaptationDesignVersionId: string;
      screenplayVersionId: string;
      expectedRowVersion: number;
      expectedInputFingerprint: string;
      reason?: string;
    },
  ) =>
    request<{ approvalId: string }>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/confirm-screenplay`,
      data,
    }),

  // ---- Voice ----
  generateVoice: (
    episodeId: string,
    data: { projectId: number; screenplayVersionId: string; expectedRowVersion: number; reason?: string },
  ) =>
    request<GenerateCommandResult>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/generate-voice`,
      data,
    }),
  reviseVoice: (
    episodeId: string,
    data: {
      projectId: number;
      voiceScriptVersionId: string;
      payload: unknown;
      expectedRowVersion: number;
      expectedContentHash: string;
      reason: string;
    },
  ) =>
    request<{ voiceScriptVersionId: string }>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/revise-voice`,
      data,
    }),
  regenerateVoice: (
    episodeId: string,
    data: {
      projectId: number;
      screenplayVersionId: string;
      expectedRowVersion: number;
      reason: string;
      subjectKind?: "content" | "audit";
    },
  ) =>
    request<GenerateCommandResult>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/regenerate-voice`,
      data,
    }),
  rollbackToScreenplay: (
    episodeId: string,
    data: {
      projectId: number;
      screenplayVersionId: string;
      payload: unknown;
      expectedRowVersion: number;
      reason: string;
    },
  ) =>
    request<{ screenplayVersionId: string }>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/rollback-to-screenplay`,
      data,
    }),
  confirmVoice: (
    episodeId: string,
    data: {
      projectId: number;
      voiceScriptVersionId: string;
      expectedRowVersion: number;
      expectedInputFingerprint: string;
      expectedContentHash: string;
      reason?: string;
    },
  ) =>
    request<{ approvalId: string }>({
      method: "POST",
      url: `/screenplayPipeline/episodes/${episodeId}/confirm-voice`,
      data,
    }),

  // ---- Queries ----
  voiceVersions: (episodeId: string, params: { projectId: number; page: number; pageSize: number }) =>
    request<PagedResult<VoiceScriptVersion>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/voice-versions`,
      params,
    }),
  stage2Delivery: (episodeId: string, projectId: number) =>
    request<unknown>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/stage2-delivery`,
      params: { projectId },
    }),
  audits: (
    episodeId: string,
    params: { projectId: number; page: number; pageSize: number; subjectType?: "screenplay" | "voice-script" },
  ) =>
    request<PagedResult<Stage2Audit>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/audits`,
      params,
    }),
  issues: (
    episodeId: string,
    params: {
      projectId: number;
      page: number;
      pageSize: number;
      subjectType?: "screenplay" | "voice-script";
      status?: "open" | "resolved" | "accepted" | "dismissed";
    },
  ) =>
    request<PagedResult<Stage2Issue>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/issues`,
      params,
    }),
  approvals: (
    episodeId: string,
    params: {
      projectId: number;
      page: number;
      pageSize: number;
      gate?: "screenplay-first-confirmation" | "voice-second-confirmation";
    },
  ) =>
    request<PagedResult<ApprovalRecord>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/approvals`,
      params,
    }),
  decideIssue: (
    issueId: string,
    data: { projectId: number; decision: "resolved" | "accepted" | "dismissed"; reason: string },
  ) => request<null>({ method: "POST", url: `/screenplayPipeline/issues/${issueId}/decide`, data }),
  // Helper aliases for typed consumers
  listAudits: (episodeId: string, params: { projectId: number; page: number; pageSize: number }) =>
    request<PagedResult<Stage2Audit>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/audits`,
      params,
    }),
  listIssues: (episodeId: string, params: { projectId: number; page: number; pageSize: number }) =>
    request<PagedResult<Stage2Issue>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/issues`,
      params,
    }),
  listApprovals: (episodeId: string, params: { projectId: number; page: number; pageSize: number }) =>
    request<PagedResult<ApprovalRecord>>({
      method: "GET",
      url: `/screenplayPipeline/episodes/${episodeId}/approvals`,
      params,
    }),
  // Re-export types for TS convenience
  __types: {} as {
    VoiceScriptVersion: VoiceScriptVersion;
    ArtifactVersion: ArtifactVersion;
    Stage2Task: Stage2Task;
  },
};
