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
import VoiceAuditDeliveryPanel from "./VoiceAuditDeliveryPanel.vue";
import VersionHistoryDrawer from "./VersionHistoryDrawer.vue";
import IssueDrawer from "./IssueDrawer.vue";
import { ref } from "vue";

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

// 修复 #5：六区核心路径应使用「working」指针（在途工作候选）而非仅 active 指针。
// active* 仅在确认后写入，确认前（reviewing/draft）只能用 working* 触达。
const workingScreenplay = computed(
  () => detail.value?.workingScreenplay ?? detail.value?.activeScreenplay ?? null,
);
const workingVoice = computed(
  () => detail.value?.workingVoice ?? detail.value?.activeVoice ?? null,
);

const showEmpty = computed(() => !loading.value && episodes.value.length === 0);

const historyVisible = ref(false);
const issuesVisible = ref(false);

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
  // 修复 #5：以「working/active 剧本」为准，而非要求已有的 first approval（循环前置）。
  const sp = workingScreenplay.value;
  if (!sp?.id || !sp?.inputFingerprint) {
    MessagePlugin.error("缺少可确认的剧本或其 inputFingerprint");
    return;
  }
  try {
    await screenplayPipelineApi.confirmScreenplay(detail.value!.episode.id, {
      projectId: props.projectId,
      adaptationDesignVersionId: detail.value!.episode.activeAdaptationDesignVersionId ?? "",
      screenplayVersionId: sp.id,
      expectedRowVersion: detail.value!.episode.rowVersion,
      expectedInputFingerprint: sp.inputFingerprint,
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
  const sp = workingScreenplay.value;
  const screenplayVersionId = sp?.id ?? detail.value.episode.activeScreenplayVersionId ?? "";
  if (!screenplayVersionId) {
    MessagePlugin.error("缺少可修订的剧本版本");
    return;
  }
  try {
    await screenplayPipelineApi.reviseScreenplay(detail.value.episode.id, {
      projectId: props.projectId,
      screenplayVersionId,
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

// Voice handlers (Region 5). 修复 #5：全部改用 working* 指针（确认前即可触达），
// active* 仅在二次确认后写入，不能作为前置必要条件。
async function onVoiceGenerate(reason: string): Promise<void> {
  const sp = workingScreenplay.value;
  if (!sp?.id) return;
  try {
    await screenplayPipelineApi.generateVoice(detail.value!.episode.id, {
      projectId: props.projectId,
      screenplayVersionId: sp.id,
      expectedRowVersion: detail.value!.episode.rowVersion,
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
  const sp = workingScreenplay.value;
  if (!sp?.id) return;
  try {
    await screenplayPipelineApi.regenerateVoice(detail.value!.episode.id, {
      projectId: props.projectId,
      screenplayVersionId: sp.id,
      reason,
      expectedRowVersion: detail.value!.episode.rowVersion,
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
  const voice = workingVoice.value;
  if (!voice?.id || !voice?.contentHash) return;
  try {
    await screenplayPipelineApi.reviseVoice(detail.value!.episode.id, {
      projectId: props.projectId,
      voiceScriptVersionId: voice.id,
      payload,
      expectedRowVersion: detail.value!.episode.rowVersion,
      expectedContentHash: voice.contentHash,
      reason,
    });
    MessagePlugin.success("声音修订已提交");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onVoiceRollback(reason: string): Promise<void> {
  const voice = workingVoice.value;
  if (!voice?.id || !voice?.contentHash) return;
  try {
    await screenplayPipelineApi.rollbackToScreenplay(detail.value!.episode.id, {
      projectId: props.projectId,
      // 回退到「当前正在处理的剧本」派生新版本；回退时剧本 payload 由后端从源包重建。
      screenplayVersionId: workingScreenplay.value?.id ?? detail.value!.episode.activeScreenplayVersionId ?? "",
      payload: workingScreenplay.value?.payload ? JSON.parse(String(workingScreenplay.value.payload)) : {},
      expectedRowVersion: detail.value!.episode.rowVersion,
      reason,
    });
    MessagePlugin.success("已回退到剧本");
    await pipelineStore.refreshDetail();
  } catch (cause: any) {
    MessagePlugin.error(String(cause?.message ?? cause));
  }
}

async function onVoiceConfirm(reason: string): Promise<void> {
  const voice = workingVoice.value;
  if (!voice?.id || !voice?.contentHash || !voice?.inputFingerprint) {
    MessagePlugin.error("缺少 voice inputFingerprint 或 contentHash");
    return;
  }
  try {
    await screenplayPipelineApi.confirmVoice(detail.value!.episode.id, {
      projectId: props.projectId,
      voiceScriptVersionId: voice.id,
      expectedRowVersion: detail.value!.episode.rowVersion,
      expectedInputFingerprint: voice.inputFingerprint,
      expectedContentHash: voice.contentHash,
      reason,
    });
    MessagePlugin.success("第二次确认成功");
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
          <VoiceAuditDeliveryPanel
            v-else-if="activeRegion === 6 && detail"
            :project-id="projectId"
            :detail="detail"
            @confirm-voice="onVoiceConfirm" />
          <div v-else-if="detail" class="regionPlaceholder">
            <p>当前 listStatus：<strong>{{ listStatus }}</strong></p>
          </div>
        </section>

        <footer class="workbenchFooter">
          <t-button size="small" variant="outline" @click="historyVisible = true">版本历史</t-button>
          <t-button size="small" variant="outline" @click="issuesVisible = true">Issues</t-button>
        </footer>
      </main>
    </div>

    <VersionHistoryDrawer
      v-if="selectedEpisodeId"
      :project-id="projectId"
      :episode-id="selectedEpisodeId"
      v-model:visible="historyVisible" />
    <IssueDrawer
      v-if="selectedEpisodeId"
      :project-id="projectId"
      :episode-id="selectedEpisodeId"
      v-model:visible="issuesVisible"
      @decide-issue="(issueId, decision) => onDecideIssue(issueId, decision, '工作台 Issue Drawer 决议')" />
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
.workbenchFooter {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--td-component-stroke, #e7e7e7);
  background: var(--td-bg-color-container, #fff);
}
</style>
