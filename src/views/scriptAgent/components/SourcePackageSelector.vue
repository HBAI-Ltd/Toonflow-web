<template>
  <div class="sourcePackageSelector">
    <div class="selectorHeader">
      <span class="selectorTitle">{{ $t("workbench.scriptAgent.sourcePackageSelector.title") }}</span>
      <t-button size="small" variant="outline" @click="reload">
        <template #icon><i-refresh /></template>
        {{ $t("workbench.scriptAgent.sourcePackageSelector.reload") }}
      </t-button>
    </div>

    <t-loading v-if="loading" size="small" />
    <t-empty
      v-else-if="!rows.length"
      size="small"
      :title="$t('workbench.scriptAgent.sourcePackageSelector.empty')" />
    <div v-else class="packageList">
      <div
        v-for="row in rows"
        :key="row.packageId"
        class="packageRow"
        :class="{ active: row.packageId === selectedPackageId }"
        @click="onSelect(row)">
        <div class="packageMain">
          <span class="packageEpisode">#{{ row.episodeNumber }}</span>
          <span class="packageTitle">{{ row.title }}</span>
        </div>
        <div class="packageMeta">
          <span class="packageVersion">v{{ row.version }}</span>
          <span class="packageLockedAt">{{ formatTime(row.lockedAt) }}</span>
        </div>
      </div>
    </div>

    <t-pagination
      v-if="total > pageSize"
      size="small"
      :total="total"
      :current="page"
      :pageSize="pageSize"
      :showJumper="false"
      @change="onPageChange" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type { PackageListItem } from "@/types/sourceFoundation";

const props = defineProps<{
  projectId: string;
  selectedPackageId: string | null;
}>();

const emit = defineEmits<{
  (e: "select", packageId: string): void;
}>();

const rows = ref<PackageListItem[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

async function load() {
  loading.value = true;
  try {
    const res = await sourceFoundationApi.listLockedPackages({
      projectId: Number(props.projectId),
      page: page.value,
      pageSize: pageSize.value,
    });
    rows.value = res.items;
    total.value = res.total;
    // Clear selection when the previously chosen package is no longer usable
    // (no longer present in the locked_valid list).
    if (props.selectedPackageId && !res.items.some((r) => r.packageId === props.selectedPackageId)) {
      emit("select", "");
    }
  } catch {
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function reload() {
  page.value = 1;
  load();
}

function onPageChange(current: number) {
  page.value = current;
  load();
}

function onSelect(row: PackageListItem) {
  emit("select", row.packageId);
}

function formatTime(ts: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(load);
defineExpose({ reload });
</script>

<style lang="scss" scoped>
.sourcePackageSelector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  .selectorHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    .selectorTitle {
      font-size: 13px;
      font-weight: 600;
    }
  }
  .packageList {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 320px;
    overflow-y: auto;
  }
  .packageRow {
    border: 1px solid var(--td-border-level-1-color);
    border-radius: 6px;
    padding: 8px 10px;
    cursor: pointer;
    background: var(--td-bg-color-container);
    transition: border-color 0.2s ease, background-color 0.2s ease;
    &:hover {
      background: var(--td-bg-color-container-hover);
    }
    &.active {
      border-color: var(--td-brand-color);
      background: var(--td-brand-color-light);
    }
    .packageMain {
      display: flex;
      align-items: center;
      gap: 6px;
      .packageEpisode {
        font-size: 12px;
        font-weight: 600;
        background: var(--td-bg-color-component);
        padding: 1px 6px;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .packageTitle {
        font-size: 13px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .packageMeta {
      margin-top: 4px;
      display: flex;
      gap: 10px;
      font-size: 11px;
      color: var(--td-text-color-secondary);
    }
  }
}
</style>
