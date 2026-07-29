<script setup lang="ts">
import { onBeforeUnmount, onMounted, computed } from "vue";
import projectStore from "@/stores/project";
import { makeScreenplayPipelineStore } from "@/stores/screenplayPipeline";
import type { WorkbenchRegion } from "@/stores/screenplayPipeline";
import { storeToRefs } from "pinia";

// 仙侠剧本工作台壳（六区 Tab + 左侧 Episode 队列）。
// 当前 shell 仅为 Task 10 入口；后续 Task 11–13 将在右侧切换对应区域组件。

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

function onSelectEpisode(id: string): void {
  pipelineStore.selectEpisode(id);
}

function onRefreshAll(): void {
  void pipelineStore.refreshEpisodes();
  if (selectedEpisodeId.value) {
    void pipelineStore.refreshDetail();
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
        <div class="paneHeader">
          <span>Episode</span>
          <span class="count">{{ episodes.length }}</span>
        </div>
        <div v-if="loading" class="paneState">加载中…</div>
        <div v-else-if="showEmpty" class="paneState">
          <span>暂无 Episode</span>
          <t-button size="small" variant="outline" @click="onRefreshAll">重试</t-button>
        </div>
        <ul v-else class="episodeList">
          <li
            v-for="item in episodes"
            :key="item.id"
            class="episodeItem"
            :class="{ active: item.id === selectedEpisodeId }"
            @click="onSelectEpisode(item.id)">
            <div class="episodeNumber">#{{ item.episodeNumber }} {{ item.title }}</div>
            <div class="episodeMeta">
              <span class="listStatus" :data-status="item.listStatus">{{ item.listStatus }}</span>
            </div>
          </li>
        </ul>
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
          <div v-else-if="detail" class="regionPlaceholder">
            <p>当前 listStatus：<strong>{{ listStatus }}</strong></p>
            <p>后续 Task 11–13 将在此渲染六区内容（队列 / 改编 / 剧本 / 第一次审核 / 声音脚本 / 第二次审核）。</p>
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
  .paneHeader {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
    font-weight: 500;
  }
  .paneState {
    padding: 24px 16px;
    color: var(--td-text-color-secondary, #666);
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  .episodeList {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: auto;
  }
  .episodeItem {
    padding: 12px 16px;
    border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
    cursor: pointer;
    &:hover {
      background: var(--td-bg-color-container-hover, #f5f5f5);
    }
    &.active {
      background: var(--td-brand-color-light, #e6f0ff);
    }
    .episodeNumber {
      font-weight: 500;
    }
    .episodeMeta {
      margin-top: 4px;
    }
    .listStatus {
      font-size: 12px;
      color: var(--td-text-color-secondary, #666);
    }
  }
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
  padding: 16px;
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
  p {
    margin: 0 0 8px;
  }
}
</style>
