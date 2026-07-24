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
