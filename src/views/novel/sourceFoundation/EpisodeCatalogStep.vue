<template>
  <div class="episode-catalog-step">
    <t-card class="catalog-panel" :bordered="true" :header-bordered="true">
      <template #header>
        <div class="panel-head">
          <span class="title">{{ $t("workbench.sourceFoundation.catalog.title") }}</span>
          <t-tag v-if="catalog" :theme="catalogStatusTheme(catalog.status)" variant="light">
            {{ $t(`workbench.sourceFoundation.catalog.status.${catalog.status}`) }}
          </t-tag>
          <t-tag v-else-if="!loading" variant="outline">{{ $t("workbench.sourceFoundation.catalog.empty") }}</t-tag>
        </div>
      </template>
      <div class="actions">
        <t-button theme="primary" :loading="creating" :disabled="!store.selectedBatchId" @click="createCatalog">
          {{ $t("workbench.sourceFoundation.catalog.create") }}
        </t-button>
        <t-button variant="outline" :loading="validating" :disabled="!catalog" @click="validateCatalog">
          {{ $t("workbench.sourceFoundation.catalog.validate") }}
        </t-button>
        <t-button variant="outline" :disabled="!catalog" @click="openAdd">
          {{ $t("workbench.sourceFoundation.catalog.addItem") }}
        </t-button>
      </div>

      <div v-if="catalog" class="catalog-meta">
        <span class="meta">{{ $t("workbench.sourceFoundation.catalog.version") }}: v{{ catalog.version }}</span>
        <span class="meta">{{ $t("workbench.sourceFoundation.catalog.itemsCount") }}: {{ catalog.items.length }}</span>
        <span class="meta">{{ $t("workbench.sourceFoundation.catalog.lockedCount") }}: {{ lockedCount }}</span>
      </div>

      <div v-if="validationIssues.length" class="validation-issues">
        <div class="section-label">{{ $t("workbench.sourceFoundation.catalog.validationIssues") }}</div>
        <t-tag
          v-for="(issue, idx) in validationIssues"
          :key="idx"
          theme="danger"
          variant="light"
          size="small"
        >
          {{ $t(`workbench.sourceFoundation.catalog.rule.${issue.code}`) }}: {{ issue.itemIds.join(", ") }}
        </t-tag>
      </div>

      <t-table
        row-key="id"
        :data="catalog?.items ?? []"
        :columns="itemColumns"
        :loading="loading"
        hover
        size="small"
      >
        <template #status="{ row }">
          <t-tag size="small" :theme="itemStatusTheme(row.status)" variant="light">
            {{ $t(`workbench.sourceFoundation.catalog.itemStatus.${row.status}`) }}
          </t-tag>
        </template>
        <template #operation="{ row }">
          <t-link theme="primary" hover="color" @click="openEdit(row)">
            {{ $t("workbench.sourceFoundation.catalog.edit") }}
          </t-link>
          <t-link
            v-if="row.status !== 'locked'"
            theme="danger"
            hover="color"
            class="ml"
            @click="removeItem(row)"
          >
            {{ $t("workbench.sourceFoundation.catalog.delete") }}
          </t-link>
          <span v-else class="locked-hint">{{ $t("workbench.sourceFoundation.catalog.lockedHint") }}</span>
        </template>
      </t-table>
    </t-card>

    <t-dialog
      v-model:visible="editVisible"
      :header="editForm.itemId ? $t('workbench.sourceFoundation.catalog.editTitle') : $t('workbench.sourceFoundation.catalog.addTitle')"
      width="640px"
      :confirm-btn="null"
      :cancel-btn="null"
    >
      <t-form :data="editForm" label-width="120px">
        <t-form-item :label="$t('workbench.sourceFoundation.catalog.episodeNumber')">
          <t-input-number v-model="editForm.episodeNumber" :min="1" theme="normal" />
        </t-form-item>
        <t-form-item :label="$t('workbench.sourceFoundation.catalog.titleField')">
          <t-input v-model="editForm.title" />
        </t-form-item>
        <t-form-item :label="$t('workbench.sourceFoundation.catalog.startOrderIndex')">
          <t-input-number v-model="editForm.startOrderIndex" :min="1" theme="normal" />
        </t-form-item>
        <t-form-item :label="$t('workbench.sourceFoundation.catalog.endOrderIndex')">
          <t-input-number v-model="editForm.endOrderIndex" :min="1" theme="normal" />
        </t-form-item>
        <t-form-item :label="$t('workbench.sourceFoundation.catalog.targetDurationSec')">
          <t-input-number v-model="targetDurationSecProxy" :min="1" theme="normal" />
        </t-form-item>
        <t-form-item :label="$t('workbench.sourceFoundation.catalog.note')">
          <t-textarea v-model="noteProxy" :autosize="{ minRows: 2, maxRows: 4 }" />
        </t-form-item>
      </t-form>
      <div class="edit-footer">
        <t-button variant="outline" @click="editVisible = false">
          {{ $t("workbench.sourceFoundation.catalog.cancel") }}
        </t-button>
        <t-button theme="primary" :loading="saving" @click="submitItem">
          {{ $t("workbench.sourceFoundation.catalog.save") }}
        </t-button>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin, type PrimaryTableCol, type TableRowData } from "tdesign-vue-next";
import projectStore from "@/stores/project";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type { CatalogDetail, CatalogItem, CatalogRuleIssue } from "@/types/sourceFoundation";
import { useSourceFoundationStore } from "@/stores/sourceFoundation";

const projectId = Number(projectStore().project?.id);
const store = useSourceFoundationStore(projectId);

const catalog = ref<CatalogDetail | null>(null);
const loading = ref(false);
const creating = ref(false);
const validating = ref(false);
const saving = ref(false);
const validationIssues = ref<CatalogRuleIssue[]>([]);

const itemColumns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "episodeNumber", title: "集号", width: 70 },
  { colKey: "title", title: "标题", ellipsis: true },
  { colKey: "startOrderIndex", title: "起始章", width: 90 },
  { colKey: "endOrderIndex", title: "结束章", width: 90 },
  { colKey: "targetDurationSec", title: "目标时长(秒)", width: 120 },
  { colKey: "status", title: "状态", width: 100 },
  { colKey: "operation", title: "操作", width: 160, fixed: "right" },
];

const lockedCount = computed(() => catalog.value?.items.filter((i) => i.status === "locked").length ?? 0);

function catalogStatusTheme(status: string) {
  if (status === "locked") return "success";
  if (status === "valid") return "primary";
  if (status === "partially_locked") return "warning";
  return "default";
}

function itemStatusTheme(status: string) {
  if (status === "locked") return "success";
  if (status === "valid") return "primary";
  if (status === "reconfirm") return "warning";
  return "default";
}

async function reloadCatalog() {
  if (!store.selectedBatchId) {
    catalog.value = null;
    return;
  }
  loading.value = true;
  try {
    catalog.value = await sourceFoundationApi.catalogCurrent({ projectId, batchId: store.selectedBatchId });
    store.selectedCatalogId = catalog.value?.id ?? null;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.catalog.loadFailed"));
  } finally {
    loading.value = false;
  }
}

async function createCatalog() {
  if (!store.selectedBatchId) return;
  creating.value = true;
  try {
    const res = await sourceFoundationApi.catalogCreate({ projectId, batchId: store.selectedBatchId });
    store.selectedCatalogId = res.catalogId;
    await reloadCatalog();
    await store.refreshOverview();
    window.$message.success($t("workbench.sourceFoundation.catalog.created"));
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.catalog.createFailed"));
  } finally {
    creating.value = false;
  }
}

async function validateCatalog() {
  if (!catalog.value) return;
  validating.value = true;
  try {
    const res = await sourceFoundationApi.catalogValidate(catalog.value.id, { projectId });
    validationIssues.value = res.issues;
    await reloadCatalog();
    await store.refreshOverview();
    if (res.valid) {
      MessagePlugin.success($t("workbench.sourceFoundation.catalog.valid"));
    } else {
      window.$message.warning($t("workbench.sourceFoundation.catalog.invalid"));
    }
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.catalog.validateFailed"));
  } finally {
    validating.value = false;
  }
}

// ---- Edit / Add dialog ----
const editVisible = ref(false);
const editForm = reactive({
  itemId: "" as string,
  expectedVersion: 0 as number,
  episodeNumber: 1 as number,
  title: "" as string,
  startOrderIndex: 1 as number,
  endOrderIndex: 1 as number,
  targetDurationSec: null as number | null,
  note: null as string | null,
});

const targetDurationSecProxy = computed<number | undefined>({
  get: () => editForm.targetDurationSec ?? undefined,
  set: (v) => {
    editForm.targetDurationSec = v ?? null;
  },
});
const noteProxy = computed<string | undefined>({
  get: () => editForm.note ?? undefined,
  set: (v) => {
    editForm.note = v ?? null;
  },
});

function resetEditForm() {
  editForm.itemId = "";
  editForm.expectedVersion = 0;
  editForm.episodeNumber = 1;
  editForm.title = "";
  editForm.startOrderIndex = 1;
  editForm.endOrderIndex = 1;
  editForm.targetDurationSec = null;
  editForm.note = null;
}

function openAdd() {
  resetEditForm();
  const maxEnd = catalog.value?.items.reduce((max, i) => Math.max(max, i.endOrderIndex), 0) ?? 0;
  editForm.startOrderIndex = maxEnd + 1;
  editForm.endOrderIndex = maxEnd + 1;
  editForm.episodeNumber = (catalog.value?.items.length ?? 0) + 1;
  editVisible.value = true;
}

function openEdit(row: CatalogItem) {
  if (row.status === "locked") {
    window.$message.warning($t("workbench.sourceFoundation.catalog.lockedHint"));
    return;
  }
  editForm.itemId = row.id;
  editForm.expectedVersion = row.rowVersion;
  editForm.episodeNumber = row.episodeNumber;
  editForm.title = row.title;
  editForm.startOrderIndex = row.startOrderIndex;
  editForm.endOrderIndex = row.endOrderIndex;
  editForm.targetDurationSec = row.targetDurationSec;
  editForm.note = row.note;
  editVisible.value = true;
}

function isConflict(e: unknown) {
  const err = e as { data?: { errorCode?: string }; errorCode?: string } | undefined;
  return err?.data?.errorCode === "CONFLICT" || err?.errorCode === "CONFLICT";
}

async function submitItem() {
  if (!catalog.value) return;
  saving.value = true;
  try {
    if (editForm.itemId) {
      await sourceFoundationApi.updateCatalogItem(editForm.itemId, {
        projectId,
        expectedVersion: editForm.expectedVersion,
        episodeNumber: editForm.episodeNumber,
        title: editForm.title,
        startOrderIndex: editForm.startOrderIndex,
        endOrderIndex: editForm.endOrderIndex,
        targetDurationSec: editForm.targetDurationSec,
        note: editForm.note,
      });
    } else {
      await sourceFoundationApi.addCatalogItem(catalog.value.id, {
        projectId,
        episodeNumber: editForm.episodeNumber,
        title: editForm.title,
        startOrderIndex: editForm.startOrderIndex,
        endOrderIndex: editForm.endOrderIndex,
        targetDurationSec: editForm.targetDurationSec,
        note: editForm.note,
      });
    }
    window.$message.success($t("workbench.sourceFoundation.catalog.saved"));
    editVisible.value = false;
    await reloadCatalog();
    await store.refreshOverview();
  } catch (e) {
    if (isConflict(e)) {
      window.$message.warning($t("workbench.sourceFoundation.conflictRefresh"));
      await reloadCatalog();
    } else {
      window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.catalog.saveFailed"));
    }
  } finally {
    saving.value = false;
  }
}

async function removeItem(row: CatalogItem) {
  if (row.status === "locked") return;
  try {
    await sourceFoundationApi.deleteCatalogItem(row.id, { projectId, expectedVersion: row.rowVersion });
    window.$message.success($t("workbench.sourceFoundation.catalog.deleted"));
    await reloadCatalog();
    await store.refreshOverview();
  } catch (e) {
    if (isConflict(e)) {
      window.$message.warning($t("workbench.sourceFoundation.conflictRefresh"));
      await reloadCatalog();
    } else {
      window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.catalog.deleteFailed"));
    }
  }
}

onMounted(async () => {
  await store.refreshOverview();
  store.selectedBatchId ??= store.overview?.batch.currentId ?? null;
  await reloadCatalog();
});
</script>

<style lang="scss" scoped>
.episode-catalog-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  .title {
    font-weight: 600;
  }
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.catalog-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
}
.validation-issues {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  .section-label {
    width: 100%;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-bottom: 4px;
  }
}
.ml {
  margin-left: 12px;
}
.locked-hint {
  font-size: 12px;
  color: var(--td-text-color-secondary);
  margin-left: 12px;
}
.edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
