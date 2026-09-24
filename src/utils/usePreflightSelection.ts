import { computed, ref, watch } from "vue";
import { restorePreflightSelection } from "./preflight";
import type { PreflightState } from "./preflight";

export function usePreflightSelection(state: () => PreflightState | undefined, sessionKey: () => string) {
  const selectedIds = ref<string[]>([]);
  const selectionKey = computed(() => {
    const current = state();
    if (current?.review?.status !== "complete" || !current.pendingFindings) return null;
    return `scriptAgent-preflight-selection:${sessionKey()}:${current.review.id}`;
  });
  let restoring = false;
  watch([selectionKey, () => state()?.pendingFindings?.findings], () => {
    let saved: string | null = null;
    const key = selectionKey.value;
    if (key) {
      try { saved = localStorage.getItem(key); } catch { /* Storage can be unavailable. */ }
    }
    restoring = true;
    try {
      selectedIds.value = key ? restorePreflightSelection(state(), saved) : [];
    } finally {
      restoring = false;
    }
  }, { immediate: true, flush: "sync" });
  watch(selectedIds, (ids) => {
    const key = selectionKey.value;
    if (!key || restoring) return;
    try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* Server state remains available without local storage. */ }
  }, { flush: "sync" });
  return selectedIds;
}
