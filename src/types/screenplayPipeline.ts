// 镜像后端 src/domain/screenplayPipeline/contracts.ts 中的 DTO 形状。
// 前端不另创 UI 状态枚举：EpisodeListStatus 必须与后端 artifactState.ts 同步。

export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

export type EpisodeListStatus =
  | "pending"
  | "adaptation-review"
  | "adaptation-blocked"
  | "screenplay-review"
  | "screenplay-blocked"
  | "screenplay-confirmed"
  | "voice-generating"
  | "voice-review"
  | "voice-blocked"
  | "stage2-complete"
  | "unadaptable";

export type RevisionState = "draft" | "reviewing" | "blocked" | "locked" | "superseded";
export type JobState = "idle" | "queued" | "running" | "failed";
export type CompatibilityState = "current" | "compatible" | "stale";
export type AttentionState = "none" | "needs-confirmation" | "blocked";

export type ApprovalGate = "screenplay-first-confirmation" | "voice-second-confirmation";
export type AuditSubjectType = "screenplay" | "voice-script";
export type IssueSubjectType = "screenplay" | "voice-script";

export interface Stage2Episode {
  id: string;
  projectId: number;
  episodeNumber: number;
  title: string;
  currentSourcePackageId: string;
  activeAdaptationDesignVersionId: string | null;
  activeScreenplayVersionId: string | null;
  activeVoiceScriptVersionId: string | null;
  targetDurationSec: number | null;
  rowVersion: number;
  createdAt: number;
}

export interface Stage2EpisodeSummary extends Stage2Episode {
  listStatus: EpisodeListStatus;
}

export interface ArtifactVersion {
  id: string;
  episodeId: string;
  projectId: number;
  version: number;
  sourcePackageId: string;
  schemaVersion: string;
  revisionState: RevisionState;
  jobState: JobState;
  attentionState: AttentionState;
  compatibilityState: CompatibilityState;
  supersededById: string | null;
  supersedesId: string | null;
  inputFingerprint: string;
  contentHash: string | null;
  createdBy: number | null;
  createdAt: number;
  lockedBy: number | null;
  lockedAt: number | null;
}

export interface VoiceScriptVersion extends ArtifactVersion {
  screenplayVersionId: string;
  adaptationDesignVersionId: string;
}

export interface ApprovalRecord {
  approvalId: string;
  episodeId: string;
  gate: ApprovalGate;
  adaptationDesignVersionId: string;
  screenplayVersionId: string;
  voiceScriptVersionId: string | null;
  sourcePackageId: string;
  dependencySnapshotHash: string;
  auditId: string;
  omniscientGrantIds: string[];
  acceptedIssueIds: string[];
  operatorId: number;
  reason: string | null;
  createdAt: number;
}

export interface Stage2Audit {
  id: string;
  episodeId: string;
  projectId: number;
  subjectType: AuditSubjectType;
  subjectVersionId: string;
  promptVersion: string;
  modelConfigFingerprint: string;
  inputFingerprint: string;
  blockerCount: number;
  warningCount: number;
  payload: string;
  createdAt: number;
}

export interface Stage2Issue {
  id: string;
  episodeId: string;
  projectId: number;
  subjectType: IssueSubjectType;
  subjectVersionId: string;
  code: string;
  severity: "blocker" | "confirm" | "warning" | "info";
  status: "open" | "resolved" | "accepted" | "dismissed";
  message: string;
  beatId: string | null;
  voiceSegmentId: string | null;
  sceneId: string | null;
  segmentId: string | null;
  factRef: unknown | null;
  payload: string;
  createdAt: number;
}

export interface Stage2Task {
  id: number;
  taskClass: string;
  model: string;
  status: string;
  state: string;
  episodeId: string;
  projectId: number;
  createdAt: number;
  finishedAt: number | null;
}

export interface Stage2EpisodeDetail {
  episode: Stage2Episode;
  listStatus: EpisodeListStatus;
  activeAdaptation: ArtifactVersion | null;
  activeScreenplay: ArtifactVersion | null;
  activeVoice: VoiceScriptVersion | null;
  workingAdaptation: ArtifactVersion | null;
  workingScreenplay: ArtifactVersion | null;
  workingVoice: VoiceScriptVersion | null;
  currentFirstApproval: ApprovalRecord | null;
  currentSecondApproval: ApprovalRecord | null;
  latestAudits: Stage2Audit[];
  openIssues: Stage2Issue[];
  currentTask: Stage2Task | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EpisodeListResponse {
  items: Stage2EpisodeSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VoiceScriptDraft {
  voiceSegmentId: string;
  text: string;
  performance: {
    emotion: string | null;
    pace: "slow" | "normal" | "fast" | null;
    pauses: Array<{ afterText: string; strength: "short" | "medium" | "long" }>;
    emphasis: string[];
  };
}

export interface GenerateCommandResult {
  episodeId: string;
  subjectVersionId: string;
  taskId: number;
  created?: boolean;
}
