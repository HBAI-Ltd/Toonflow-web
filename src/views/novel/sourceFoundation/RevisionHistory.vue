<template>
  <t-drawer
    v-model:visible="visible"
    :header="$t('workbench.sourceFoundation.revisionHistory.title')"
    size="480px"
    :footer="false"
    @cancel="close"
  >
    <t-table
      row-key="versionId"
      :data="versions"
      :columns="columns"
      :loading="loading"
      hover
      size="small"
    >
      <template #createdAt="{ row }">
        <span class="time">{{ formatTime(row.createdAt) }}</span>
      </template>
      <template #source="{ row }">
        <t-tag size="small" :theme="row.source === 'manual' ? 'success' : 'primary'" variant="light">
          {{ row.source }}
        </t-tag>
      </template>
      <template #operation="{ row }">
        <t-link theme="primary" hover="color" @click="onRevise(row)">
          {{ $t("workbench.sourceFoundation.revisionHistory.useAsBase") }}
        </t-link>
      </template>
    </t-table>
  </t-drawer>
</template>

<script setup lang="ts">
import type { PrimaryTableCol, TableRowData } from "tdesign-vue-next";
import dayjs from "dayjs";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type { ChapterVersionRow } from "@/types/sourceFoundation";

const props = defineProps<{
  novelId: number | null;
  projectId: number;
}>();

const visible = defineModel<boolean>();
const emit = defineEmits<{
  (e: "revise", version: ChapterVersionRow): void;
}>();

const versions = ref<ChapterVersionRow[]>([]);
const loading = ref(false);

const columns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "version", title: "版本", width: 70 },
  { colKey: "reel", title: "卷", width: 90, ellipsis: true },
  { colKey: "chapter", title: "章节", ellipsis: true },
  { colKey: "source", title: "来源", width: 90 },
  { colKey: "createdAt", title: "创建时间", width: 160 },
  { colKey: "operation", title: "操作", width: 110, fixed: "right" },
];

function formatTime(ts: number) {
  return dayjs(ts).format("YYYY-MM-DD HH:mm");
}

function close() {
  visible.value = false;
}

function onRevise(row: ChapterVersionRow) {
  emit("revise", row);
  visible.value = false;
}

async function load() {
  if (props.novelId == null) {
    versions.value = [];
    return;
  }
  loading.value = true;
  try {
    versions.value = await sourceFoundationApi.chapterVersions(props.novelId, props.projectId);
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载版本失败");
  } finally {
    loading.value = false;
  }
}

watch(
  () => [visible.value, props.novelId] as const,
  ([open]) => {
    if (open) load();
  },
);
</script>

<style lang="scss" scoped>
.time {
  font-size: 12px;
  color: var(--td-text-color-secondary);
}
</style>
