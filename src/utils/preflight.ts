export interface PreflightBlockRef {
  importId: string;
  internalIndex: number;
}

export interface PreflightState {
  passed?: boolean;
  pendingFindings?: {
    findings: { findingId: string; level: "🟡" | "⚠️"; blockRef: PreflightBlockRef; issue: string }[];
    blockingIssues: { issueId: string; blockRef: PreflightBlockRef; issue: string }[];
  };
  review?: { id: string; status: "running" | "complete" | "failed"; proposalId?: string };
  proposal?: {
    id: string;
    confirmed: boolean;
    blocks: (PreflightBlockRef & {
      oldText: string;
      newText: string;
      baseHash: string;
      diff: { type: "equal" | "remove" | "add"; text: string }[];
    })[];
  };
}

export interface PreflightAction {
  type: "repair" | "confirm_diff" | "confirm_commit" | "ignore" | "proceed" | "discard";
  reviewId?: string;
  proposalId?: string;
  findingIds?: string[];
}

export interface PreflightUpdate {
  preflight?: PreflightState;
  preflightReport?: string;
}

export function getPreflightPhase(state?: PreflightState) {
  if (state?.review?.status === "running") return "reviewing";
  if (state?.proposal && !state.proposal.confirmed) return "diff";
  if (state?.review?.status === "failed") return "failed";
  if (state?.proposal?.confirmed && (state.review?.status !== "complete" || state.review.proposalId !== state.proposal.id)) return "awaiting_review";
  if (state?.passed) return "passed";
  return state?.review?.status === "complete" ? "findings" : "unreviewed";
}

export function restorePreflightSelection(state: PreflightState | undefined, saved: string | null): string[] {
  const findings = state?.pendingFindings?.findings ?? [];
  if (saved !== null) {
    try {
      const ids = JSON.parse(saved);
      if (Array.isArray(ids)) return [...new Set<string>(ids.filter((id) => findings.some((item) => item.findingId === id)))];
    } catch { /* Invalid saved choices fall back to the review defaults. */ }
  }
  return findings.filter((item) => item.level === "🟡").map((item) => item.findingId);
}

export function buildPreflightAction(
  state: PreflightState | undefined,
  type: PreflightAction["type"],
  selected: string[] = [],
  busy = false,
): PreflightAction | null {
  if (busy) return null;
  if (type === "discard") return state?.proposal?.id ? { type, proposalId: state.proposal.id } : null;
  const phase = getPreflightPhase(state);
  // 看完差异后两条出路：再复审一遍，或者跳过复审直接落库——都只在 diff 阶段可用
  if (type === "confirm_diff" || type === "confirm_commit") return phase === "diff" ? { type, proposalId: state!.proposal!.id } : null;
  if (phase !== "findings" || !state?.review?.id) return null;
  if (type === "repair") {
    const findingIds = restorePreflightSelection(state, JSON.stringify(selected));
    return findingIds.length ? { type, reviewId: state.review.id, findingIds } : null;
  }
  const issueCount = (state.pendingFindings?.findings?.length ?? 0) + (state.pendingFindings?.blockingIssues?.length ?? 0);
  if (type === "proceed" && issueCount > 0) return null;
  return { type, reviewId: state.review.id };
}
