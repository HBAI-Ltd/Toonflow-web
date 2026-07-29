// 仙侠剧本工作台 Store。
// 关键不变量（设计 §21.5）：
//   - 不持久化到 Local Storage：状态、版本、审批、问题全部从后端投影；
//   - 轮询只在 jobState queued/running 且页面可见时进行，卸载时停止；
//   - 工作候选由服务端查询投影，不在客户端裁剪。

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { screenplayPipelineApi } from "@/api/screenplayPipeline";
import type {
  EpisodeListStatus,
  Stage2EpisodeDetail,
  Stage2EpisodeSummary,
  VoiceScriptDraft,
} from "@/types/screenplayPipeline";

export const POLL_INTERVAL_MS = 2000;

export type WorkbenchRegion = 1 | 2 | 3 | 4 | 5 | 6;

export function makeScreenplayPipelineStore(projectId: number) {
  return defineStore(`screenplayPipeline-${projectId}`, () => {
    const selectedEpisodeId = ref<string | null>(null);
    const activeRegion = ref<WorkbenchRegion>(1);
    const episodes = ref<Stage2EpisodeSummary[]>([]);
    const detail = ref<Stage2EpisodeDetail | null>(null);
    const voiceDraft = ref<VoiceScriptDraft | null>(null);
    const voiceDraftDirty = ref(false);
    const lastError = ref<string | null>(null);
    const loading = ref(false);
    const detailLoading = ref(false);

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const listStatus = computed<EpisodeListStatus | null>(() => detail.value?.listStatus ?? null);
    const isActiveVoiceJobRunning = computed(() => {
      const task = detail.value?.currentTask;
      return task != null && (task.status === "queued" || task.status === "running");
    });

    async function refreshEpisodes(): Promise<void> {
      loading.value = true;
      lastError.value = null;
      try {
        const r = await screenplayPipelineApi.listEpisodes({
          projectId,
          page: 1,
          pageSize: 100,
        });
        episodes.value = r.items;
      } catch (cause) {
        lastError.value = String(cause);
      } finally {
        loading.value = false;
      }
    }

    async function refreshDetail(): Promise<void> {
      if (!selectedEpisodeId.value) {
        detail.value = null;
        return;
      }
      detailLoading.value = true;
      try {
        detail.value = await screenplayPipelineApi.episodeDetail(selectedEpisodeId.value, projectId);
      } catch (cause) {
        lastError.value = String(cause);
      } finally {
        detailLoading.value = false;
      }
    }

    function selectEpisode(episodeId: string | null): void {
      selectedEpisodeId.value = episodeId;
      detail.value = null;
      voiceDraft.value = null;
      voiceDraftDirty.value = false;
      if (episodeId) {
        void refreshDetail();
      }
    }

    function setRegion(region: WorkbenchRegion): void {
      activeRegion.value = region;
    }

    function setVoiceDraft(draft: VoiceScriptDraft | null, dirty = false): void {
      voiceDraft.value = draft;
      voiceDraftDirty.value = dirty;
    }

    function clearVoiceDraft(): void {
      voiceDraft.value = null;
      voiceDraftDirty.value = false;
    }

    function pollWhileActive(): void {
      stopPolling();
      if (typeof document !== "undefined" && document.hidden) return;
      pollTimer = setInterval(() => {
        if (document.hidden) return;
        if (!isActiveVoiceJobRunning.value) {
          stopPolling();
          return;
        }
        void refreshDetail();
      }, POLL_INTERVAL_MS);
    }

    function stopPolling(): void {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    return {
      selectedEpisodeId,
      activeRegion,
      episodes,
      detail,
      voiceDraft,
      voiceDraftDirty,
      lastError,
      loading,
      detailLoading,
      listStatus,
      isActiveVoiceJobRunning,
      refreshEpisodes,
      refreshDetail,
      selectEpisode,
      setRegion,
      setVoiceDraft,
      clearVoiceDraft,
      pollWhileActive,
      stopPolling,
    };
  });
}

export type ScreenplayPipelineStore = ReturnType<ReturnType<typeof makeScreenplayPipelineStore>>;
