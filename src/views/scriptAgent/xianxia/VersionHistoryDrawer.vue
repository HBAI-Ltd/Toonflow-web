<script setup lang="ts">
// 版本历史 Drawer：版本号 / state / compatibility / 内容哈希 / 审批 / 时间。
// 历史版本只读，不能覆盖当前 Active Version。
import { computed, onMounted, ref, watch } from "vue";
import { screenplayPipelineApi } from "@/api/screenplayPipeline";
import type { VoiceScriptVersion } from "@/types/screenplayPipeline";

const props = defineProps<{
  projectId: number;
  episodeId: string | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", v: boolean): void;
}>();

const items = ref<VoiceScriptVersion[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function load(): Promise<void> {
  if (!props.episodeId) {
    items.value = [];
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const r = await screenplayPipelineApi.voiceVersions(props.episodeId, {
      projectId: props.projectId,
      page: 1,
      pageSize: 100,
    });
    items.value = r.items;
  } catch (cause: any) {
    error.value = String(cause?.message ?? cause);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.episodeId],
  ([v]) => {
    if (v) void load();
  },
);

onMounted(() => {
  if (props.visible) void load();
});

function onClose(): void {
  emit("update:visible", false);
}

const sorted = computed(() => [...items.value].sort((a, b) => b.version - a.version));
</script>

<template>
  <t-drawer
    :visible="visible"
    header="Voice Script 版本历史"
    :on-close="onClose"
    size="medium"
    @update:visible="(v: boolean) => emit('update:visible', v)">
    <div v-if="loading" class="state">加载中…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="sorted.length === 0" class="state">暂无版本</div>
    <ul v-else class="list">
      <li v-for="item in sorted" :key="item.id" class="item">
        <div class="row1">
          <span class="vid">v{{ item.version }}</span>
          <span class="vid">{{ item.id }}</span>
        </div>
        <div class="row2">
          <span>state: <strong>{{ item.revisionState }}</strong></span>
          <span>compatibility: <strong>{{ item.compatibilityState }}</strong></span>
        </div>
        <div class="row3">
          <span>hash: {{ item.contentHash ?? "—" }}</span>
        </div>
        <div class="row4">
          <span>创建: {{ item.createdAt }} · {{ item.createdBy ?? "—" }}</span>
          <span v-if="item.lockedAt">锁定: {{ item.lockedAt }} · {{ item.lockedBy ?? "—" }}</span>
        </div>
        <div v-if="item.supersedesId" class="row5">supersedes: {{ item.supersedesId }}</div>
      </li>
    </ul>
  </t-drawer>
</template>

<style scoped lang="scss">
.state {
  padding: 24px;
  color: var(--td-text-color-secondary, #666);
  text-align: center;
  &.error {
    color: var(--td-error-color, #d54941);
  }
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item {
  padding: 12px;
  border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
  .row1 {
    display: flex;
    gap: 8px;
    align-items: center;
    .vid {
      font-family: monospace;
    }
  }
  .row2,
  .row3,
  .row4,
  .row5 {
    margin-top: 4px;
    font-size: 12px;
    color: var(--td-text-color-secondary, #666);
  }
}
</style>
