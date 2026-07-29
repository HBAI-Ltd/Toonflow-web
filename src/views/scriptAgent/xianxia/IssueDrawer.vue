<script setup lang="ts">
// Issue Drawer：完整问题列表 + 状态过滤 + 决议操作。
import { computed, onMounted, ref, watch } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { screenplayPipelineApi } from "@/api/screenplayPipeline";
import type { Stage2Issue } from "@/types/screenplayPipeline";

const props = defineProps<{
  projectId: number;
  episodeId: string | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", v: boolean): void;
  (e: "decideIssue", issueId: string, decision: "resolved" | "accepted" | "dismissed"): void;
}>();

const items = ref<Stage2Issue[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const statusFilter = ref<"open" | "resolved" | "accepted" | "dismissed" | "all">("all");

async function load(): Promise<void> {
  if (!props.episodeId) {
    items.value = [];
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const params: {
      projectId: number;
      page: number;
      pageSize: number;
      status?: "open" | "resolved" | "accepted" | "dismissed";
    } = {
      projectId: props.projectId,
      page: 1,
      pageSize: 100,
    };
    if (statusFilter.value !== "all") params.status = statusFilter.value;
    const r = await screenplayPipelineApi.issues(props.episodeId, params);
    items.value = r.items;
  } catch (cause: any) {
    error.value = String(cause?.message ?? cause);
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.visible, props.episodeId, statusFilter.value],
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

function onDecide(issue: Stage2Issue, decision: "resolved" | "accepted" | "dismissed"): void {
  emit("decideIssue", issue.id, decision);
  void MessagePlugin.success(`Issue ${issue.code} → ${decision}`);
}

const sorted = computed(() => [...items.value].sort((a, b) => (a.severity < b.severity ? -1 : 1)));
</script>

<template>
  <t-drawer
    :visible="visible"
    header="Issues"
    :on-close="onClose"
    size="medium"
    @update:visible="(v: boolean) => emit('update:visible', v)">
    <div class="filters">
      <t-select v-model="statusFilter" clearable>
        <t-option label="open" value="open" />
        <t-option label="resolved" value="resolved" />
        <t-option label="accepted" value="accepted" />
        <t-option label="dismissed" value="dismissed" />
        <t-option label="all (default)" value="all" />
      </t-select>
    </div>
    <div v-if="loading" class="state">加载中…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="sorted.length === 0" class="state">暂无 Issues</div>
    <ul v-else class="issueList">
      <li v-for="issue in sorted" :key="issue.id" class="issue">
        <div class="row1">
          <span class="code">{{ issue.code }}</span>
          <span class="sev" :data-sev="issue.severity">{{ issue.severity }}</span>
          <span class="status">{{ issue.status }}</span>
        </div>
        <div class="message">{{ issue.message }}</div>
        <div class="row2">
          <span>subjectType: {{ issue.subjectType }}</span>
          <span>subjectVersionId: {{ issue.subjectVersionId }}</span>
        </div>
        <div v-if="issue.status === 'open'" class="actions">
          <t-button size="small" variant="outline" @click="onDecide(issue, 'resolved')">resolved</t-button>
          <t-button size="small" variant="outline" @click="onDecide(issue, 'accepted')">accepted</t-button>
          <t-button size="small" variant="outline" theme="danger" @click="onDecide(issue, 'dismissed')">dismissed</t-button>
        </div>
      </li>
    </ul>
  </t-drawer>
</template>

<style scoped lang="scss">
.filters {
  margin-bottom: 8px;
}
.state {
  padding: 24px;
  color: var(--td-text-color-secondary, #666);
  text-align: center;
  &.error {
    color: var(--td-error-color, #d54941);
  }
}
.issueList {
  list-style: none;
  margin: 0;
  padding: 0;
}
.issue {
  padding: 12px;
  border-bottom: 1px solid var(--td-component-stroke, #e7e7e7);
  .row1 {
    display: flex;
    gap: 8px;
    align-items: center;
    .code {
      font-family: monospace;
      font-weight: 600;
    }
    .sev {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      &[data-sev="blocker"] {
        background: #fde7e7;
        color: #d54941;
      }
      &[data-sev="confirm"] {
        background: #fff3e0;
        color: #c2671f;
      }
      &[data-sev="warning"] {
        background: #fff8e6;
        color: #b88400;
      }
      &[data-sev="info"] {
        background: #e6f4ff;
        color: #0052d9;
      }
    }
  }
  .message {
    margin: 4px 0;
    font-size: 13px;
  }
  .row2 {
    font-size: 12px;
    color: var(--td-text-color-secondary, #666);
  }
  .actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
  }
}
</style>
