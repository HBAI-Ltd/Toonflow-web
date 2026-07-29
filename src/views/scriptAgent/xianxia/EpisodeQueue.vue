<script setup lang="ts">
// Region 1: Episode 队列。只读展示后端投影；点击切换 selectedEpisodeId。
import { computed } from "vue";
import type { Stage2EpisodeSummary } from "@/types/screenplayPipeline";

const props = defineProps<{
  episodeId: string | null;
  episodes: Stage2EpisodeSummary[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "select", id: string): void;
}>();

const sorted = computed(() => [...props.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber));

function onSelect(id: string): void {
  emit("select", id);
}

function statusLabel(s: string): string {
  return s;
}
</script>

<template>
  <div class="episodeQueue">
    <div v-if="loading" class="state">加载中…</div>
    <div v-else-if="sorted.length === 0" class="state">暂无 Episode</div>
    <ul v-else class="list">
      <li
        v-for="ep in sorted"
        :key="ep.id"
        class="item"
        :class="{ active: ep.id === episodeId }"
        @click="onSelect(ep.id)">
        <div class="row1">
          <span class="num">#{{ ep.episodeNumber }}</span>
          <span class="title">{{ ep.title }}</span>
        </div>
        <div class="row2">
          <span class="badge" :data-status="ep.listStatus">{{ statusLabel(ep.listStatus) }}</span>
          <span class="pkg">pkg: {{ ep.currentSourcePackageId }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.episodeQueue {
  height: 100%;
  overflow: auto;
}
.state {
  padding: 24px 16px;
  color: var(--td-text-color-secondary, #666);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
  cursor: pointer;
  &:hover {
    background: var(--td-bg-color-container-hover, #f5f5f5);
  }
  &.active {
    background: var(--td-brand-color-light, #e6f0ff);
  }
  .row1 {
    display: flex;
    gap: 8px;
    align-items: center;
    .num {
      font-weight: 600;
    }
  }
  .row2 {
    display: flex;
    gap: 8px;
    margin-top: 4px;
    align-items: center;
    font-size: 12px;
    color: var(--td-text-color-secondary, #666);
  }
  .badge {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--td-bg-color-component, #f0f0f0);
  }
}
</style>
