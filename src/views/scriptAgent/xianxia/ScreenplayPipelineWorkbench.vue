<script setup lang="ts">
import { onBeforeUnmount, onMounted, computed, watch } from "vue";
import projectStore from "@/stores/project";
import { makeScreenplayPipelineStore } from "@/stores/screenplayPipeline";
import type { WorkbenchRegion } from "@/stores/screenplayPipeline";
import { storeToRefs } from "pinia";
import { screenplayPipelineApi } from "@/api/screenplayPipeline";
import { MessagePlugin } from "tdesign-vue-next";

import EpisodeQueue from "./EpisodeQueue.vue";
import AdaptationDesignPanel from "./AdaptationDesignPanel.vue";
import ScreenplayPanel from "./ScreenplayPanel.vue";
import ScreenplayAuditPanel from "./ScreenplayAuditPanel.vue";
import VoiceScriptPanel from "./VoiceScriptPanel.vue";

const props = defineProps<{ projectId: number }>();

const { project } = storeToRefs(projectStore());
const pipelineStore = makeScreenplayPipelineStore(props.projectId)();
const {
  selectedEpisodeId,
  activeRegion,
  episodes,
  detail,
  loading,
  detailLoading,
  lastError,
  listStatus,
  isActiveVoiceJobRunning,
} = storeToRefs(pipelineStore);

const regionLabels: Record<WorkbenchRegion, string> = {
  1: "Episode 队列",
  2: "改编设计",
  3: "剧本",
  4: "第一次审核",
  5: "声音脚本",
  6: "第二次审核 / 交付",
};

const showEmpty = computed(() => !loading.value && episodes.value.length === 0);

onMounted(async () => {
  await pipelineStore.refreshEpisodes();
});

onBeforeUnmount(() => {
  pipelineStore.stopPolling();
});

watch(isActiveVoiceJobRunning, (running) => {
  if (running) pipelineStore.pollWhileActive();
  else pipelineStore.stopPolling();
});

function onSelectEpisode(id: string): void {
  pipelineStore.selectEpisode(id);
}

function onRefreshAll(): void {
  void pipelineStore.refreshEpisodes();
  if (selectedEpisodeId.value) {
    void pipelineStore.refreshDetail();
  }
}

// Adaptation generate stub (oversight by parent; emits success message).
async function onAdaptationGenerate(reason: string): Promise<void> {
  if (!detail.value?.episode.activeAdaptationDesignVersionId && !detail.value?.episode.id) return;
  try {
    // Real call would be to screenplayPipelineApi.generateAdaptation for the current episode.
    await screenplayPipelineApi.generateAdaptation(detail.value!.episode.id, {
      projectId: props.projectId,
      expectedRowVersion: detail.value!.episode.rowVersion,
      reason,
    });
    MessagePlugin.success("改编生成已发起");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

// Screenplay regenerate confirm-with-reason stub.
async function onScreenplayRegenerate(reason: string, subjectKind: "content" | "audit"): Promise<void> {
  if (!detail.value) return;
  try {
    await screenplayPipelineApi.regenerateScreenplay(detail.value.episode.id, {
      projectId: props.projectId,
      adaptationDesignVersionId: detail.value.episode.activeAdaptationDesignVersionId ?? "",
      reason,
      expectedRowVersion: detail.value.episode.rowVersion,
      subjectKind,
    });
    MessagePlugin.success("剧本重做已发起");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onScreenplayConfirm(reason: string): Promise<void> {
  if (!detail.value?.currentFirstApproval) return;
  try {
    await screenplayPipelineApi.confirmScreenplay(detail.value.episode.id, {
      projectId: props.projectId,
      adaptationDesignVersionId: detail.value.episode.activeAdaptationDesignVersionId ?? "",
      screenplayVersionId: detail.value.episode.activeScreenplayVersionId ?? "",
      expectedRowVersion: detail.value.episode.rowVersion,
      expectedInputFingerprint: detail.value.activeScreenplay?.inputFingerprint ?? "",
      reason,
    });
    MessagePlugin.success("第一次确认成功");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onScreenplayRevise(payload: unknown, reason: string): Promise<void> {
  if (!detail.value) return;
  try {
    await screenplayPipelineApi.reviseScreenplay(detail.value.episode.id, {
      projectId: props.projectId,
      screenplayVersionId: detail.value.episode.activeScreenplayVersionId ?? "",
      payload,
      expectedRowVersion: detail.value.episode.rowVersion,
      reason,
    });
    MessagePlugin.success("剧本修订已提交");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onDecideIssue(issueId: string, decision: "resolved" | "accepted" | "dismissed", reason: string): Promise<void> {
  try {
    await screenplayPipelineApi.decideIssue(issueId, {
      projectId: props.projectId,
      decision,
      reason,
    });
    MessagePlugin.success("Issue 决议成功");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

// Voice handlers (Region 5).
async function onVoiceGenerate(reason: string): Promise<void> {
  if (!detail.value?.episode.activeScreenplayVersionId) return;
  try {
    await screenplayPipelineApi.generateVoice(detail.value.episode.id, {
      projectId: props.projectId,
      screenplayVersionId: detail.value.episode.activeScreenplayVersionId,
      expectedRowVersion: detail.value.episode.rowVersion,
      reason,
    });
    MessagePlugin.success("声音生成已发起");
    await pipelineStore.refreshDetail();
    pipelineStore.pollWhileActive();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onVoiceRegenerate(reason: string, subjectKind: "content" | "audit"): Promise<void> {
  if (!detail.value?.episode.activeScreenplayVersionId) return;
  try {
    await screenplayPipelineApi.regenerateVoice(detail.value.episode.id, {
      projectId: props.projectId,
      screenplayVersionId: detail.value.episode.activeScreenplayVersionId,
      reason,
      expectedRowVersion: detail.value.episode.rowVersion,
      subjectKind,
    });
    MessagePlugin.success("声音重做已发起");
    await pipelineStore.refreshDetail();
    pipelineStore.pollWhileActive();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onVoiceRevise(payload: unknown, reason: string): Promise<void> {
  if (!detail.value?.episode.activeVoiceScriptVersionId || !detail.value.activeVoice?.contentHash) return;
  try {
    await screenplayPipelineApi.reviseVoice(detail.value.episode.id, {
      projectId: props.projectId,
      voiceScriptVersionId: detail.value.episode.activeVoiceScriptVersionId,
      payload,
      expectedRowVersion: detail.value.episode.rowVersion,
      expectedContentHash: detail.value.activeVoice.contentHash,
      reason,
    });
    MessagePlugin.success("声音修订已提交");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onVoiceRollback(reason: string): Promise<void> {
  if (!detail.value?.episode.activeVoiceScriptVersionId || !detail.value.activeVoice?.contentHash) return;
  try {
    await screenplayPipelineApi.rollbackToScreenplay(detail.value.episode.id, {
      projectId: props.projectId,
      screenplayVersionId: detail.value.workingScreenplay?.id ?? detail.value.episode.activeScreenplayVersionId ?? "",
      payload: detail.value.workingScreenplay ?? {},
      expectedRowVersion: detail.value.episode.rowVersion,
      reason,
    });
    MessagePlugin.success("已回退到剧本");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}
</script>

<template>
  <div class="screenplayWorkbench">
    <header class="workbenchHeader">
      <div class="title">
        <span class="titleText">仙侠剧本工作台</span>
        <span v-if="project" class="projectTag">{{ project.name }}</span>
      </div>
      <div class="headerActions">
        <t-button size="small" variant="outline" @click="onRefreshAll">
          刷新
        </t-button>
      </div>
    </header>

    <div class="workbenchBody">
      <aside class="episodesPane">
        <EpisodeQueue
          :episode-id="selectedEpisodeId"
          :episodes="episodes"
          :loading="loading"
          @select="onSelectEpisode" />
      </aside>

      <main class="rightPane">
        <nav class="regionTabs">
          <button
            v-for="region in [1, 2, 3, 4, 5, 6] as WorkbenchRegion[]"
            :key="region"
            class="regionTab"
            :class="{ active: region === activeRegion }"
            @click="pipelineStore.setRegion(region)">
            {{ region }}. {{ regionLabels[region] }}
          </button>
        </nav>

        <section class="regionBody">
          <div v-if="!selectedEpisodeId" class="emptyHint">请在左侧选择一个 Episode</div>
          <div v-else-if="detailLoading && !detail" class="emptyHint">加载详情…</div>
          <div v-else-if="lastError" class="emptyHint error">{{ lastError }}</div>
          <EpisodeQueue
            v-else-if="activeRegion === 1"
            :episode-id="selectedEpisodeId"
            :episodes="episodes"
            :loading="loading"
            @select="onSelectEpisode" />
          <AdaptationDesignPanel
            v-else-if="activeRegion === 2 && detail"
            :project-id="projectId"
            :episode-id="detail.episode.id"
            :working="detail.workingAdaptation"
            :active="detail.activeAdaptation"
            :loading="detailLoading"
            @generate="onAdaptationGenerate" />
          <ScreenplayPanel
            v-else-if="activeRegion === 3 && detail"
            :project-id="projectId"
            :episode-id="detail.episode.id"
            :working="detail.workingScreenplay"
            :active="detail.activeScreenplay"
            :loading="detailLoading"
            @regenerate="onScreenplayRegenerate"
            @confirm="onScreenplayConfirm"
            @revise="onScreenplayRevise" />
          <ScreenplayAuditPanel
            v-else-if="activeRegion === 4 && detail"
            :detail="detail"
            @decide-issue="onDecideIssue" />
          <VoiceScriptPanel
            v-else-if="activeRegion === 5 && detail"
            :project-id="projectId"
            :episode-id="detail.episode.id"
            :working="detail.workingVoice"
            :active="detail.activeVoice"
            :loading="detailLoading"
            :last-error="lastError ?? null"
            @generate="onVoiceGenerate"
            @regenerate="onVoiceRegenerate"
            @revise="onVoiceRevise"
            @rollback-to-screenplay="onVoiceRollback" />
          <div v-else-if="detail" class="regionPlaceholder">
            <p>当前 listStatus：<strong>{{ listStatus }}</strong></p>
            <p>后续 Task 12–13 将在此渲染声音脚本 / 第二次审核 / 交付（区域 5/6）。</p>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.screenplayWorkbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--td-bg-color-container, #fff);
}
.workbenchHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
  .title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .titleText {
    font-weight: 600;
    font-size: 16px;
  }
  .projectTag {
    color: var(--td-text-color-secondary, #666);
    font-size: 12px;
  }
}
.workbenchBody {
  flex: 1;
  display: flex;
  min-height: 0;
}
.episodesPane {
  width: 280px;
  border-right: 1px solid var(--td-component-stroke, #e7e7e7);
  display: flex;
  flex-direction: column;
}
.rightPane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.regionTabs {
  display: flex;
  border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
  .regionTab {
    flex: 1;
    padding: 12px 8px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 13px;
    &.active {
      border-bottom-color: var(--td-brand-color, #0052d9);
      color: var(--td-brand-color, #0052d9);
      font-weight: 500;
    }
  }
}
.regionBody {
  flex: 1;
  overflow: auto;
}
.emptyHint {
  color: var(--td-text-color-secondary, #666);
  padding: 24px;
  text-align: center;
  &.error {
    color: var(--td-error-color, #d54941);
  }
}
.regionPlaceholder {
  padding: 16px;
  p {
    margin: 0 0 8px;
  }
}
</style>
