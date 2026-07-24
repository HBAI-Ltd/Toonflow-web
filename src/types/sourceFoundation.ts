export type BatchStatus =
  | "draft"
  | "running"
  | "completed"
  | "partial_failed"
  | "canceling"
  | "canceled"
  | "interrupted"
  | "archived";

export type ChapterHeadStatus = "missing" | "ready" | "stale" | "conflicted";

export type PackageStatus =
  | "building"
  | "build_failed"
  | "review_required"
  | "blocked"
  | "locked_valid"
  | "rebuild_required"
  | "superseded";

export type SourceFoundationNextAction =
  | "import_source"
  | "create_batch"
  | "resume_batch"
  | "resolve_blockers"
  | "create_catalog"
  | "build_package"
  | "lock_package"
  | "enter_stage_2";

export interface SourceFoundationOverview {
  batch: {
    currentId: string | null;
    status: BatchStatus | null;
    pending: number;
    running: number;
    succeeded: number;
    failed: number;
  };
  facts: {
    missing: number;
    ready: number;
    stale: number;
    conflicted: number;
  };
  issues: {
    blocker: number;
    confirm: number;
    warning: number;
  };
  catalog: {
    currentId: string | null;
    status: string | null;
    items: number;
    lockedItems: number;
  };
  packages: {
    building: number;
    blocked: number;
    reviewRequired: number;
    locked: number;
    rebuildRequired: number;
  };
  scripts: {
    active: number;
    reconfirm: number;
  };
  nextAction: SourceFoundationNextAction;
}

export interface PageResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

// ---- Step 1: Source batch ----
// Mirrors SourceRevisionService.PagedChapters / ChapterListItem.
export interface SourceChapterRow {
  novelId: number;
  chapterIndex: number;
  reel: string | null;
  chapter: string | null;
  chapterData: string | null;
  currentVersionId: string | null;
  headStatus: string | null;
  headRowVersion: number | null;
}

export interface PagedSourceChapters {
  total: number;
  page: number;
  pageSize: number;
  items: SourceChapterRow[];
}

// Mirrors SourceRevisionService.ChapterVersionItem.
export interface ChapterVersionRow {
  versionId: string;
  version: number;
  reel: string | null;
  chapter: string | null;
  chapterData: string;
  normalizedHash: string;
  source: string;
  createdBy: number | null;
  createdAt: number;
}

// Mirrors BatchService.BatchListItem / BatchDetail.
export interface BatchDetail {
  id: string;
  projectId: number;
  sequence: number;
  startChapterIndex: number;
  endChapterIndex: number;
  status: string;
  maxConcurrency: number;
  cancelRequestedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
}

export interface PagedBatches {
  total: number;
  page: number;
  pageSize: number;
  items: BatchDetail[];
}

// ---- Step 2: Fact / Semantic registry ----
// Mirrors FactAnalysisService.ChapterFactListItem / PagedChapterFacts.
export interface ChapterFactListItem {
  novelId: number;
  chapterIndex: number;
  title: string | null;
  headStatus: string;
  headRowVersion: number;
  factVersionId: string | null;
  factVersion: number | null;
  factOrigin: string | null;
  factCreatedAt: number | null;
}

export interface PagedChapterFacts {
  total: number;
  page: number;
  pageSize: number;
  items: ChapterFactListItem[];
}

export interface FactVersionHistoryItem {
  factVersionId: string;
  version: number;
  origin: string;
  contentHash: string;
  replacesVersionId: string | null;
  createdBy: number | null;
  createdAt: number;
}

export interface ChapterFactDetail {
  factVersionId: string;
  novelId: number;
  version: number;
  schemaVersion: string;
  origin: string;
  replacesVersionId: string | null;
  contentHash: string;
  createdBy: number | null;
  createdAt: number;
  headStatus: string | null;
  headRowVersion: number | null;
  // ChapterFactV1 payload is a structured domain object; keep loose for UI.
  payload: Record<string, unknown>;
  history: FactVersionHistoryItem[];
  sourceRevision: {
    versionId: string;
    version: number;
    reel: string | null;
    chapter: string | null;
    normalizedHash: string;
    source: string;
    createdBy: number | null;
    createdAt: number;
  };
}

// Mirrors SemanticRegistryService.SemanticObjectListItem / PagedSemanticObjects.
export interface SemanticObjectListItem {
  semanticObjectId: string;
  kind: string;
  type: string;
  status: string;
  canonicalName: string | null;
  currentRevisionId: string | null;
  currentVersion: number | null;
  createdAt: number;
}

export interface PagedSemanticObjects {
  total: number;
  page: number;
  pageSize: number;
  items: SemanticObjectListItem[];
}

export interface SemanticRevisionView {
  revisionId: string;
  version: number;
  canonicalName: string;
  aliases: string[];
  stableTraits: unknown;
  genrePayload: unknown;
  evidence: unknown;
  origin: string;
  contentHash: string;
  createdBy: number | null;
  createdAt: number;
}

export interface MentionBindingView {
  bindingId: string;
  batchId: string;
  factVersionId: string;
  mentionId: string;
  semanticRevisionId: string | null;
  status: string;
  ambiguityLevel: string;
  decidedBy: number | null;
  decidedAt: number | null;
}

export interface SemanticObjectDetail {
  semanticObjectId: string;
  projectId: number;
  kind: string;
  type: string;
  status: string;
  currentRevisionId: string | null;
  createdAt: number;
  currentRevision: SemanticRevisionView | null;
  revisions: SemanticRevisionView[];
  bindings: MentionBindingView[];
}

// Mirrors SemanticRegistryService.SourceIssueItem / PagedIssues.
export interface SourceIssue {
  issueId: string;
  projectId: number;
  batchId: string | null;
  scopeType: string;
  scopeId: string;
  code: string;
  severity: "blocker" | "confirm" | "warning";
  status: "open" | "resolved" | "accepted" | "dismissed";
  message: string;
  evidence: unknown;
  inputFingerprint: string;
  resolutionReason: string | null;
  resolvedBy: number | null;
  resolvedAt: number | null;
}

export interface PagedSourceIssues {
  total: number;
  page: number;
  pageSize: number;
  items: SourceIssue[];
}

// ---- Step 3: Episode catalog ----
// Mirrors EpisodeCatalogService.CatalogItem.
export interface CatalogItem {
  id: string;
  catalogId: string;
  episodeNumber: number;
  title: string;
  startOrderIndex: number;
  endOrderIndex: number;
  status: "draft" | "valid" | "locked" | "reconfirm";
  targetDurationSec: number | null;
  note: string | null;
  rowVersion: number;
}

// Mirrors EpisodeCatalogService.CatalogDetail.
export interface CatalogDetail {
  id: string;
  projectId: number;
  batchId: string;
  version: number;
  status: string;
  createdBy: number | null;
  createdAt: number;
  items: CatalogItem[];
}

// Mirrors CatalogRuleIssue.
export interface CatalogRuleIssue {
  code:
    | "CATALOG_RANGE_INVALID"
    | "CATALOG_OUT_OF_BOUNDS"
    | "CATALOG_OVERLAP"
    | "LOCKED_RANGE_OVERLAP"
    | "DUPLICATE_EPISODE_NUMBER";
  itemIds: string[];
}

export interface CatalogValidation {
  valid: boolean;
  issues: CatalogRuleIssue[];
}

// ---- Step 4: Source package ----
// Mirrors SourcePackageService.PackageDetail.
export interface PackageListItem {
  packageId: string;
  catalogItemId: string;
  episodeNumber: number;
  title: string;
  version: number;
  contentHash: string;
  lockedAt: number;
}

export interface PagedLockedPackages {
  total: number;
  page: number;
  pageSize: number;
  items: PackageListItem[];
}

export interface PackageBuildStart {
  packageId: string;
  taskId: number;
}

export interface PackageLockResult {
  packageId: string;
  version: number;
  contentHash: string;
}

// AuditFinding from AuditResultV1; the package GET may expose these alongside
// the payload when the build completes. Optional until backend exposes them.
export interface AuditFinding {
  code: string;
  severity: "blocker" | "confirm" | "warning";
  scopeType: "chapter" | "semanticObject" | "catalogItem" | "package";
  scopeId: string;
  message: string;
  evidence: Array<{ novelId: number; paragraphId: string; shortQuote: string }>;
}

// Loose mirrors of the immutable V1 payloads — keep untyped sub-objects for UI.
export interface EpisodeSourcePackageV1 {
  schemaVersion: "episode-source-package-v1";
  episode: {
    episodeNumber: number;
    title: string;
    chapterRange: { startChapterIndex: number; endChapterIndex: number };
  };
  navigationSummary: string;
  chapters: Array<{
    novelId: number;
    novelVersionId: string;
    title: string;
    sourceText: string;
  }>;
  facts: unknown[];
  semantics: Array<{
    objectId: string;
    revisionId: string;
    kind: "entity" | "term";
    canonicalName: string;
    aliases: string[];
    profile: unknown;
  }>;
  relations: Array<{
    id: string;
    type: string;
    source: string;
    target: string;
    evidence: unknown;
  }>;
  acceptedRisks: Array<{ issueId: string; reason: string }>;
}

export interface DependencyManifestV1 {
  schemaVersion: "dependency-manifest-v1";
  projectConfigFingerprint: string;
  catalog: {
    catalogId: string;
    catalogVersion: number;
    catalogItemId: string;
    itemVersion: number;
  };
  novelVersions: Array<{ novelId: number; novelVersionId: string; contentHash: string }>;
  factVersions: Array<{ novelId: number; factVersionId: string; contentHash: string }>;
  semanticRevisions: Array<{ semanticObjectId: string; semanticRevisionId: string; contentHash: string }>;
  relationIds: string[];
  issueDecisions: Array<{
    issueId: string;
    status: "resolved" | "accepted" | "dismissed";
    inputFingerprint: string;
  }>;
  audit: { auditId: string; inputFingerprint: string };
}

export interface PackageDetail {
  packageId: string;
  projectId: number;
  catalogId: string;
  catalogItemId: string;
  version: number;
  status: PackageStatus | string;
  schemaVersion: string;
  inputFingerprint: string;
  payload: EpisodeSourcePackageV1 | null;
  dependencyManifest: DependencyManifestV1 | null;
  contentHash: string | null;
  lockedBy: number | null;
  lockedAt: number | null;
  createdAt: number;
  // Optional: populated when backend exposes audit findings on GET.
  auditFindings?: AuditFinding[];
}
