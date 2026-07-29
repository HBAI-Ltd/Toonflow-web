import { defineStore } from "pinia";
import { ref } from "vue";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type { SourceFoundationOverview } from "@/types/sourceFoundation";

function makeSourceFoundationStore(projectId: number) {
  return defineStore(`sourceFoundation-${projectId}`, () => {
    const activeStep = ref(1);
    const selectedBatchId = ref<string | null>(null);
    const selectedChapterId = ref<number | null>(null);
    const selectedCatalogId = ref<string | null>(null);
    const selectedPackageId = ref<string | null>(null);
    const overview = ref<SourceFoundationOverview | null>(null);
    let pollTimer: number | undefined;

    async function refreshOverview() {
      overview.value = await sourceFoundationApi.overview(projectId);
      selectedBatchId.value ??= overview.value.batch.currentId;
    }

    function stopPolling() {
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
      pollTimer = undefined;
    }

    async function pollWhileActive() {
      stopPolling();
      await refreshOverview();
      const batchActive = ["running", "canceling"].includes(overview.value?.batch.status ?? "");
      const packageActive = (overview.value?.packages.building ?? 0) > 0;
      if (!document.hidden && (batchActive || packageActive)) {
        pollTimer = window.setTimeout(pollWhileActive, 2000);
      }
    }

    return {
      activeStep,
      selectedBatchId,
      selectedChapterId,
      selectedCatalogId,
      selectedPackageId,
      overview,
      refreshOverview,
      pollWhileActive,
      stopPolling,
    };
  });
}

const stores = new Map<number, ReturnType<typeof makeSourceFoundationStore>>();

export function useSourceFoundationStore(projectId: number) {
  if (!stores.has(projectId)) stores.set(projectId, makeSourceFoundationStore(projectId));
  return stores.get(projectId)!();
}
