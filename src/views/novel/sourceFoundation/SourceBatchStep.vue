<template>
  <div class="source-batch-step">
    <t-card class="batch-panel" :bordered="true" :header-bordered="true">
      <template #header>
        <div class="panel-head">
          <span class="title">{{ $t("workbench.sourceFoundation.source.batchTitle") }}</span>
          <t-tag v-if="batch" :theme="statusTheme(batch.status)" variant="light">
            {{ $t(`workbench.sourceFoundation.source.status.${batch.status}`) }}
          </t-tag>
        </div>
      </template>
      <div v-if="batch" class="batch-stats">
        <span class="stat">{{ $t("workbench.sourceFoundation.source.range") }}: {{ batch.startChapterIndex }} - {{ batch.endChapterIndex }}</span>
        <span class="stat">{{ $t("workbench.sourceFoundation.source.pending") }}: {{ batch.pending }}</span>
        <span class="stat">{{ $t("workbench.sourceFoundation.source.running") }}: {{ batch.running }}</span>
        <span class="stat">{{ $t("workbench.sourceFoundation.source.succeeded") }}: {{ batch.succeeded }}</span>
        <span class="stat danger">{{ $t("workbench.sourceFoundation.source.failed") }}: {{ batch.failed }}</span>
      </div>
      <div class="actions">
        <t-button theme="primary" @click="openImport">
          {{ $t("workbench.sourceFoundation.source.import") }}
        </t-button>
        <t-button variant="outline" :loading="creating" :disabled="!rangeCount" @click="createBatch">
          {{ $t("workbench.sourceFoundation.source.createBatch") }}
        </t-button>
        <span class="divider" />
        <t-button theme="primary" :disabled="!canStart" @click="command('start')">
          {{ $t("workbench.sourceFoundation.source.start") }}
        </t-button>
        <t-button variant="outline" :disabled="batch?.status !== 'interrupted'" @click="command('resume')">
          {{ $t("workbench.sourceFoundation.source.resume") }}
        </t-button>
        <t-button variant="outline" :disabled="!canRetry" @click="command('retry-failed')">
          {{ $t("workbench.sourceFoundation.source.retry") }}
        </t-button>
        <t-button theme="danger" variant="outline" :disabled="!canCancel" @click="command('cancel')">
          {{ $t("workbench.sourceFoundation.source.cancel") }}
        </t-button>
      </div>
      <div class="range-form">
        <div class="field">
          <label>{{ $t("workbench.sourceFoundation.source.startChapterIndex") }}</label>
          <t-input-number v-model="rangeStart" :min="1" theme="normal" />
        </div>
        <div class="field">
          <label>{{ $t("workbench.sourceFoundation.source.endChapterIndex") }}</label>
          <t-input-number v-model="rangeEnd" :min="rangeStart" theme="normal" />
        </div>
        <div class="field">
          <span class="count" :class="{ over: rangeCount > 50 }">{{ rangeCount }} / 50</span>
        </div>
      </div>
    </t-card>

    <t-card class="chapter-card" :bordered="true" :header-bordered="true">
      <template #header>
        <span class="title">{{ $t("workbench.sourceFoundation.source.chapterTitle") }}</span>
      </template>
      <t-table
        row-key="novelId"
        :data="chapters"
        :columns="chapterColumns"
        :loading="chapterLoading"
        hover
        size="small"
      >
        <template #headStatus="{ row }">
          <t-tag size="small" :theme="headStatusTheme(row.headStatus)" variant="light">
            {{ row.headStatus ?? "—" }}
          </t-tag>
        </template>
        <template #operation="{ row }">
          <t-link theme="primary" hover="color" @click="openHistory(row)">
            {{ $t("workbench.sourceFoundation.source.history") }}
          </t-link>
          <t-link theme="primary" hover="color" class="ml" @click="openEdit(row)">
            {{ $t("workbench.sourceFoundation.source.edit") }}
          </t-link>
        </template>
      </t-table>
      <div class="pager">
        <t-pagination
          v-model="chapterPage"
          v-model:pageSize="chapterPageSize"
          :total="chapterTotal"
          size="small"
          show-jumper
        />
      </div>
    </t-card>

    <t-dialog
      v-model:visible="importVisible"
      :header="$t('workbench.sourceFoundation.source.importTitle')"
      width="640px"
      :footer="false"
    >
      <div class="import-body">
        <div class="uploadArea" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
          <t-upload
            ref="uploadRef"
            v-model="fileList"
            theme="file"
            :multiple="false"
            :max="1"
            :before-upload="handleBeforeUpload"
            :request-method="noopRequest"
            style="display: none"
          />
          <p class="uploadText">{{ $t("workbench.sourceFoundation.source.dragUpload") }}</p>
          <p class="uploadHint">{{ $t("workbench.sourceFoundation.source.uploadHint") }}</p>
        </div>
        <t-divider>{{ $t("workbench.sourceFoundation.source.or") }}</t-divider>
        <t-textarea
          v-model="importContent"
          :placeholder="$t('workbench.sourceFoundation.source.pastePlaceholder')"
          :autosize="{ minRows: 8, maxRows: 8 }"
        />
        <div class="import-footer">
          <span>{{ $t("workbench.sourceFoundation.source.parsedChapters", { count: parsedChapters.length }) }}</span>
          <t-button theme="primary" :loading="importing" :disabled="!parsedChapters.length" @click="submitImport">
            {{ $t("workbench.sourceFoundation.source.submitImport") }}
          </t-button>
        </div>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="editVisible"
      :header="$t('workbench.sourceFoundation.source.editTitle')"
      width="720px"
      :confirm-btn="null"
      :cancel-btn="null"
    >
      <t-form :data="editForm" label-width="80px">
        <t-form-item label="卷" name="reel">
          <t-input v-model="editForm.reel" />
        </t-form-item>
        <t-form-item label="章节" name="chapter">
          <t-input v-model="editForm.chapter" />
        </t-form-item>
        <t-form-item label="正文" name="chapterData">
          <t-textarea v-model="editForm.chapterData" :autosize="{ minRows: 10, maxRows: 18 }" />
        </t-form-item>
      </t-form>
      <div class="edit-footer">
        <t-button variant="outline" @click="editVisible = false">
          {{ $t("workbench.sourceFoundation.source.cancel") }}
        </t-button>
        <t-button theme="primary" :loading="saving" @click="confirmEdit">
          {{ $t("workbench.sourceFoundation.source.impactConfirm") }}
        </t-button>
      </div>
    </t-dialog>

    <RevisionHistory
      v-model="historyVisible"
      :novel-id="historyNovelId"
      :project-id="projectId"
      @revise="onRevise"
    />
  </div>
</template>

<script setup lang="ts">
import { LoadingPlugin, type PrimaryTableCol, type TableRowData, type UploadFile } from "tdesign-vue-next";
import mammoth from "mammoth";
import projectStore from "@/stores/project";
import parseNovel from "@/utils/parseNovel";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type { BatchDetail, ChapterVersionRow, SourceChapterRow } from "@/types/sourceFoundation";
import { useSourceFoundationStore } from "@/stores/sourceFoundation";
import RevisionHistory from "./RevisionHistory.vue";

const projectId = Number(projectStore().project?.id);
const store = useSourceFoundationStore(projectId);

// ---- Chapter table ----
const chapters = ref<SourceChapterRow[]>([]);
const chapterTotal = ref(0);
const chapterPage = ref(1);
const chapterPageSize = ref(20);
const chapterLoading = ref(false);

const chapterColumns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "chapterIndex", title: "章节号", width: 80 },
  { colKey: "reel", title: "卷", width: 120, ellipsis: true },
  { colKey: "chapter", title: "章节名", ellipsis: true },
  { colKey: "currentVersionId", title: "当前版本", ellipsis: true },
  { colKey: "headStatus", title: "Head 状态", width: 110 },
  { colKey: "operation", title: "操作", width: 140, fixed: "right" },
];

async function loadChapters() {
  chapterLoading.value = true;
  try {
    const res = await sourceFoundationApi.chapters({
      projectId,
      page: chapterPage.value,
      pageSize: chapterPageSize.value,
    });
    chapters.value = res.items;
    chapterTotal.value = res.total;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载章节失败");
  } finally {
    chapterLoading.value = false;
  }
}

watch([chapterPage, chapterPageSize], loadChapters);

// ---- Batch ----
const batch = ref<BatchDetail | null>(null);
const creating = ref(false);

const rangeStart = ref(1);
const rangeEnd = ref(50);
const rangeCount = computed(() => Math.max(0, rangeEnd.value - rangeStart.value + 1));

async function loadBatch() {
  if (!store.selectedBatchId) {
    batch.value = null;
    return;
  }
  try {
    batch.value = await sourceFoundationApi.batch(store.selectedBatchId, projectId);
  } catch {
    batch.value = null;
  }
}

const canStart = computed(() => ["draft", "interrupted", "partial_failed"].includes(batch.value?.status ?? ""));
const canCancel = computed(() => ["running", "partial_failed", "interrupted"].includes(batch.value?.status ?? ""));
const canRetry = computed(() => batch.value?.status === "partial_failed" && (batch.value?.failed ?? 0) > 0);

function statusTheme(status: string) {
  if (status === "completed") return "success";
  if (status === "running") return "primary";
  if (status === "partial_failed" || status === "interrupted") return "warning";
  return "default";
}

function headStatusTheme(status: string | null) {
  if (status === "ready") return "success";
  if (status === "stale" || status === "conflicted") return "warning";
  if (status === "missing") return "danger";
  return "default";
}

async function createBatch() {
  if (rangeCount.value > 50) {
    window.$message.warning($t("workbench.sourceFoundation.source.rangeTooLarge"));
    return;
  }
  creating.value = true;
  try {
    const res = await sourceFoundationApi.batchCreate({
      projectId,
      startChapterIndex: rangeStart.value,
      endChapterIndex: rangeEnd.value,
    });
    store.selectedBatchId = res.batchId;
    await loadBatch();
    window.$message.success($t("workbench.sourceFoundation.source.batchCreated"));
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "创建批次失败");
  } finally {
    creating.value = false;
  }
}

async function command(cmd: "start" | "resume" | "retry-failed" | "cancel") {
  if (!store.selectedBatchId) return;
  try {
    await sourceFoundationApi.batchCommand(store.selectedBatchId, cmd, projectId);
    await loadBatch();
    store.pollWhileActive();
    pollStep();
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "操作失败");
  }
}

// ---- Import dialog (reuses project file-parsing behavior) ----
const importVisible = ref(false);
const importContent = ref("");
const importing = ref(false);
const fileList = ref<UploadFile[]>([]);
const uploadRef = ref();

const parsedChapters = computed(() => {
  if (!importContent.value) return [];
  try {
    return parseNovel(importContent.value).flatMap((reel) =>
      reel.chapters.map((chapter) => ({
        reel: reel.reel,
        chapter: chapter.chapter,
        chapterData: chapter.text,
      })),
    );
  } catch {
    return [];
  }
});

function openImport() {
  importContent.value = "";
  fileList.value = [];
  importVisible.value = true;
}

function triggerUpload() {
  uploadRef.value?.triggerUpload();
}

function noopRequest() {
  return Promise.resolve({ response: {}, status: "success" } as const);
}

async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    await handleBeforeUpload({ raw: files[0] } as UploadFile);
  }
}

async function readFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  if (file.type === "text/plain") return new TextDecoder().decode(buffer);
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function handleBeforeUpload(file: UploadFile) {
  const rawFile = file.raw;
  if (!rawFile) return false;
  const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (rawFile.type === "application/msword") {
    window.$message.warning($t("workbench.sourceFoundation.source.docNotSupported"));
    return false;
  }
  if (!allowTypes.includes(rawFile.type)) {
    window.$message.error($t("workbench.sourceFoundation.source.unsupportedType"));
    return false;
  }
  if (rawFile.size > 10 * 1024 * 1024) {
    window.$message.error($t("workbench.sourceFoundation.source.fileTooLarge"));
    return false;
  }
  LoadingPlugin(true);
  try {
    importContent.value = await readFile(rawFile);
  } catch {
    window.$message.error($t("workbench.sourceFoundation.source.parseFailed"));
  } finally {
    LoadingPlugin(false);
  }
  return false;
}

async function submitImport() {
  if (!parsedChapters.value.length) return;
  importing.value = true;
  try {
    await sourceFoundationApi.importChapters({ projectId, chapters: parsedChapters.value });
    window.$message.success($t("workbench.sourceFoundation.source.importSuccess"));
    importVisible.value = false;
    chapterPage.value = 1;
    await loadChapters();
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "导入失败");
  } finally {
    importing.value = false;
  }
}

// ---- Revision history + edit ----
const historyVisible = ref(false);
const historyNovelId = ref<number | null>(null);

const editVisible = ref(false);
const editForm = reactive({
  novelId: 0,
  expectedVersionId: "",
  reel: "",
  chapter: "",
  chapterData: "",
});
const saving = ref(false);

function openHistory(row: SourceChapterRow) {
  historyNovelId.value = row.novelId;
  historyVisible.value = true;
}

function onRevise(version: ChapterVersionRow) {
  editForm.novelId = historyNovelId.value ?? 0;
  editForm.expectedVersionId = version.versionId;
  editForm.reel = version.reel ?? "";
  editForm.chapter = version.chapter ?? "";
  editForm.chapterData = version.chapterData;
  editVisible.value = true;
}

async function openEdit(row: SourceChapterRow) {
  if (!row.currentVersionId) {
    window.$message.warning($t("workbench.sourceFoundation.source.noCurrentVersion"));
    return;
  }
  try {
    const versions = await sourceFoundationApi.chapterVersions(row.novelId, projectId);
    const current = versions.find((v) => v.versionId === row.currentVersionId);
    if (!current) {
      window.$message.warning($t("workbench.sourceFoundation.source.conflictRefresh"));
      await loadChapters();
      return;
    }
    historyNovelId.value = row.novelId;
    onRevise(current);
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载版本失败");
  }
}

function isConflict(e: unknown) {
  const err = e as { data?: { errorCode?: string }; errorCode?: string } | undefined;
  return err?.data?.errorCode === "CONFLICT" || err?.errorCode === "CONFLICT";
}

async function confirmEdit() {
  if (!editForm.novelId || !editForm.expectedVersionId) return;
  saving.value = true;
  try {
    await sourceFoundationApi.chapterRevision(editForm.novelId, {
      projectId,
      expectedVersionId: editForm.expectedVersionId,
      reel: editForm.reel,
      chapter: editForm.chapter,
      chapterData: editForm.chapterData,
    });
    window.$message.success($t("workbench.sourceFoundation.source.revisionSaved"));
    editVisible.value = false;
    await loadChapters();
    await loadBatch();
    store.pollWhileActive();
    pollStep();
  } catch (e) {
    if (isConflict(e)) {
      window.$message.warning($t("workbench.sourceFoundation.source.conflictRefresh"));
      // keep form model unchanged; reload versions to refresh expectedVersionId baseline
      try {
        const versions = await sourceFoundationApi.chapterVersions(editForm.novelId, projectId);
        const latest = versions[0];
        if (latest) editForm.expectedVersionId = latest.versionId;
      } catch {
        // ignore — user can retry
      }
    } else {
      window.$message.error((e as Error)?.message ?? "保存失败");
    }
  } finally {
    saving.value = false;
  }
}

// ---- Polling: 2s refresh while batch active ----
let localPoll: number | undefined;
function stopLocalPoll() {
  if (localPoll !== undefined) window.clearTimeout(localPoll);
  localPoll = undefined;
}
async function pollStep() {
  stopLocalPoll();
  await Promise.all([loadBatch(), loadChapters()]);
  const active = ["running", "canceling"].includes(batch.value?.status ?? "");
  if (!document.hidden && active) localPoll = window.setTimeout(pollStep, 2000);
}

onMounted(async () => {
  await store.refreshOverview();
  store.selectedBatchId ??= store.overview?.batch.currentId ?? null;
  await Promise.all([loadChapters(), loadBatch()]);
  store.pollWhileActive();
  pollStep();
});

onUnmounted(() => {
  stopLocalPoll();
  store.stopPolling();
});
</script>

<style lang="scss" scoped>
.source-batch-step {
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
.title {
  font-weight: 600;
}
.batch-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
  .stat.danger {
    color: var(--td-error-color);
  }
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  .divider {
    width: 1px;
    height: 20px;
    background: var(--td-border-level-2-color);
    margin: 0 4px;
  }
}
.range-form {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-top: 12px;
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    label {
      color: var(--td-text-color-secondary);
    }
    .count {
      font-weight: 600;
      &.over {
        color: var(--td-error-color);
      }
    }
  }
}
.chapter-card {
  .pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }
  .ml {
    margin-left: 12px;
  }
}
.import-body {
  .uploadArea {
    padding: 24px;
    border: 2px dashed var(--td-border-level-2-color);
    border-radius: 8px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s;
    &:hover {
      border-color: var(--td-brand-color);
    }
    .uploadText {
      margin: 0 0 4px;
    }
    .uploadHint {
      margin: 0;
      font-size: 12px;
      color: var(--td-text-color-secondary);
    }
  }
  .import-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    font-size: 13px;
  }
}
.edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
