<template>
  <div class="fact-registry-step">
    <div class="fact-registry-grid">
      <!-- ChapterFactList section -->
      <t-card class="grid-col chapter-fact-list" :bordered="true" :header-bordered="true">
        <template #header>
          <span class="title">{{ $t("workbench.sourceFoundation.facts.chapterFacts") }}</span>
        </template>
        <t-table
          row-key="novelId"
          :data="chapterFacts"
          :columns="chapterFactColumns"
          :loading="chapterFactLoading"
          hover
          size="small"
          @row-click="onSelectChapter"
        >
          <template #headStatus="{ row }">
            <t-tag size="small" :theme="factHeadTheme(row.headStatus)" variant="light">
              {{ row.headStatus }}
            </t-tag>
          </template>
          <template #factVersion="{ row }">
            <span v-if="row.factVersionId">v{{ row.factVersion }} ({{ row.factOrigin }})</span>
            <span v-else class="muted">—</span>
          </template>
        </t-table>
        <div class="pager">
          <t-pagination
            v-model="factPage"
            v-model:pageSize="factPageSize"
            :total="factTotal"
            size="small"
          />
        </div>
      </t-card>

      <!-- FactTimeline section -->
      <t-card class="grid-col fact-timeline" :bordered="true" :header-bordered="true">
        <template #header>
          <span class="title">{{ $t("workbench.sourceFoundation.facts.timeline") }}</span>
        </template>
        <div v-if="!selectedFact" class="empty">
          {{ $t("workbench.sourceFoundation.facts.selectChapterHint") }}
        </div>
        <div v-else class="fact-detail">
          <div class="detail-head">
            <span class="version">v{{ selectedFact.version }}</span>
            <t-tag size="small" variant="light">{{ selectedFact.origin }}</t-tag>
            <t-tag v-if="selectedFact.headStatus" size="small" :theme="factHeadTheme(selectedFact.headStatus)" variant="light">
              {{ selectedFact.headStatus }}
            </t-tag>
          </div>
          <div class="history">
            <div class="section-label">{{ $t("workbench.sourceFoundation.facts.history") }}</div>
            <t-table
              row-key="factVersionId"
              :data="selectedFact.history"
              :columns="historyColumns"
              size="small"
            />
          </div>
          <div class="source-rev">
            <div class="section-label">{{ $t("workbench.sourceFoundation.facts.sourceRevision") }}</div>
            <div class="kv">
              <span>{{ $t("workbench.sourceFoundation.facts.sourceVersion") }}: v{{ selectedFact.sourceRevision.version }}</span>
              <span>{{ selectedFact.sourceRevision.reel ?? "—" }} / {{ selectedFact.sourceRevision.chapter ?? "—" }}</span>
            </div>
          </div>
          <div class="payload">
            <div class="section-label">{{ $t("workbench.sourceFoundation.facts.payload") }}</div>
            <pre class="payload-pre">{{ JSON.stringify(selectedFact.payload, null, 2) }}</pre>
          </div>
          <div class="actions">
            <t-button theme="primary" @click="openFactRevision">
              {{ $t("workbench.sourceFoundation.facts.revise") }}
            </t-button>
          </div>
        </div>
      </t-card>

      <!-- SemanticPanel section -->
      <t-card class="grid-col semantic-panel" :bordered="true" :header-bordered="true">
        <template #header>
          <span class="title">{{ $t("workbench.sourceFoundation.facts.semantic") }}</span>
        </template>
        <t-table
          row-key="semanticObjectId"
          :data="semanticObjects"
          :columns="semanticColumns"
          :loading="semanticLoading"
          hover
          size="small"
          @row-click="onSelectSemantic"
        >
          <template #kind="{ row }">
            <t-tag size="small" variant="light">{{ row.kind }}</t-tag>
          </template>
          <template #status="{ row }">
            <t-tag size="small" :theme="row.status === 'active' ? 'success' : 'warning'" variant="light">
              {{ row.status }}
            </t-tag>
          </template>
        </t-table>
        <div v-if="selectedSemantic?.currentRevision" class="semantic-detail">
          <div class="section-label">{{ $t("workbench.sourceFoundation.facts.bindings") }}</div>
          <div v-if="!selectedSemantic.bindings.length" class="muted small">
            {{ $t("workbench.sourceFoundation.facts.noBindings") }}
          </div>
          <div v-for="binding in pendingBindings" :key="binding.bindingId" class="binding-row">
            <span class="mention">{{ binding.mentionId }}</span>
            <t-tag size="small" variant="outline">{{ binding.status }}</t-tag>
            <t-input
              v-model="bindingReason[binding.bindingId]"
              :placeholder="$t('workbench.sourceFoundation.facts.reasonPlaceholder')"
              size="small"
            />
            <t-button size="small" :disabled="!bindingReason[binding.bindingId]" @click="decideMention(binding, 'confirmed')">
              {{ $t("workbench.sourceFoundation.facts.confirm") }}
            </t-button>
            <t-button size="small" variant="outline" :disabled="!bindingReason[binding.bindingId]" @click="decideMention(binding, 'rejected')">
              {{ $t("workbench.sourceFoundation.facts.reject") }}
            </t-button>
          </div>
        </div>
      </t-card>
    </div>

    <div class="issue-bar">
      <t-button @click="issueDrawerVisible = true">
        {{ $t("workbench.sourceFoundation.issues.open") }} ({{ openIssueCount }})
      </t-button>
    </div>

    <!-- Fact revision dialog -->
    <t-dialog
      v-model:visible="revisionVisible"
      :header="$t('workbench.sourceFoundation.facts.reviseTitle')"
      width="720px"
      :confirm-btn="null"
      :cancel-btn="null"
    >
      <t-form label-width="120px">
        <t-form-item label="expectedHeadRowVersion">
          <t-input-number v-model="revisionForm.expectedHeadRowVersion" :min="1" theme="normal" />
        </t-form-item>
        <t-form-item :label="$t('workbench.sourceFoundation.facts.payload')">
          <t-textarea
            v-model="revisionForm.payloadText"
            :autosize="{ minRows: 12, maxRows: 20 }"
          />
        </t-form-item>
      </t-form>
      <div class="edit-footer">
        <t-button variant="outline" @click="revisionVisible = false">
          {{ $t("workbench.sourceFoundation.source.cancel") }}
        </t-button>
        <t-button theme="primary" :loading="savingRevision" @click="submitFactRevision">
          {{ $t("workbench.sourceFoundation.source.impactConfirm") }}
        </t-button>
      </div>
    </t-dialog>

    <IssueDrawer v-model="issueDrawerVisible" :issues="issues" @decide="decideIssue" />
  </div>
</template>

<script setup lang="ts">
import { MessagePlugin, type PrimaryTableCol, type RowEventContext, type TableRowData } from "tdesign-vue-next";
import projectStore from "@/stores/project";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type {
  ChapterFactDetail,
  ChapterFactListItem,
  MentionBindingView,
  SemanticObjectDetail,
  SemanticObjectListItem,
  SourceIssue,
} from "@/types/sourceFoundation";
import { useSourceFoundationStore } from "@/stores/sourceFoundation";
import IssueDrawer from "./IssueDrawer.vue";

const projectId = Number(projectStore().project?.id);
const store = useSourceFoundationStore(projectId);

// ---- ChapterFactList section ----
const chapterFacts = ref<ChapterFactListItem[]>([]);
const factTotal = ref(0);
const factPage = ref(1);
const factPageSize = ref(20);
const chapterFactLoading = ref(false);
const selectedChapterId = ref<number | null>(store.selectedChapterId);

const chapterFactColumns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "chapterIndex", title: "章节", width: 70 },
  { colKey: "title", title: "标题", ellipsis: true },
  { colKey: "headStatus", title: "状态", width: 90 },
  { colKey: "factVersion", title: "事实版本", width: 140 },
];

function factHeadTheme(status: string | null) {
  if (status === "ready") return "success";
  if (status === "stale" || status === "conflicted") return "warning";
  if (status === "missing") return "danger";
  return "default";
}

async function loadChapterFacts() {
  chapterFactLoading.value = true;
  try {
    const res = await sourceFoundationApi.facts({ projectId, page: factPage.value, pageSize: factPageSize.value });
    chapterFacts.value = res.items;
    factTotal.value = res.total;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载事实失败");
  } finally {
    chapterFactLoading.value = false;
  }
}

watch([factPage, factPageSize], loadChapterFacts);

function onSelectChapter(context: RowEventContext<TableRowData>) {
  const row = context.row as ChapterFactListItem;
  selectedChapterId.value = row.novelId;
  store.selectedChapterId = row.novelId;
  if (row.factVersionId) loadFactDetail(row.factVersionId);
  else selectedFact.value = null;
}

// ---- FactTimeline section ----
const selectedFact = ref<ChapterFactDetail | null>(null);

const historyColumns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "version", title: "版本", width: 70 },
  { colKey: "origin", title: "来源", width: 90 },
  { colKey: "contentHash", title: "Hash", ellipsis: true },
  { colKey: "createdAt", title: "时间" },
];

async function loadFactDetail(factVersionId: string) {
  try {
    selectedFact.value = await sourceFoundationApi.factDetail(factVersionId, projectId);
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载事实详情失败");
  }
}

function openFactRevision() {
  if (!selectedFact.value) return;
  revisionForm.expectedFactVersionId = selectedFact.value.factVersionId;
  revisionForm.expectedHeadRowVersion = selectedFact.value.headRowVersion ?? 1;
  revisionForm.payloadText = JSON.stringify(selectedFact.value.payload, null, 2);
  revisionVisible.value = true;
}

// ---- Fact revision ----
const revisionVisible = ref(false);
const savingRevision = ref(false);
const revisionForm = reactive({
  expectedFactVersionId: "",
  expectedHeadRowVersion: 1,
  payloadText: "",
});

function isConflict(e: unknown) {
  const err = e as { data?: { errorCode?: string }; errorCode?: string } | undefined;
  return err?.data?.errorCode === "CONFLICT" || err?.errorCode === "CONFLICT";
}

async function submitFactRevision() {
  if (!selectedFact.value) return;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(revisionForm.payloadText);
  } catch {
    window.$message.error($t("workbench.sourceFoundation.facts.invalidPayload"));
    return;
  }
  savingRevision.value = true;
  try {
    const res = await sourceFoundationApi.factRevision(selectedFact.value.factVersionId, {
      projectId,
      expectedFactVersionId: revisionForm.expectedFactVersionId,
      expectedHeadRowVersion: revisionForm.expectedHeadRowVersion,
      payload,
    });
    window.$message.success($t("workbench.sourceFoundation.facts.revisionSaved"));
    revisionVisible.value = false;
    await loadFactDetail(res.factVersionId);
    await loadChapterFacts();
  } catch (e) {
    if (isConflict(e)) {
      window.$message.warning($t("workbench.sourceFoundation.source.conflictRefresh"));
    } else {
      window.$message.error((e as Error)?.message ?? "保存失败");
    }
  } finally {
    savingRevision.value = false;
  }
}

// ---- SemanticPanel section ----
const semanticObjects = ref<SemanticObjectListItem[]>([]);
const semanticLoading = ref(false);
const selectedSemantic = ref<SemanticObjectDetail | null>(null);
const bindingReason = ref<Record<string, string>>({});

const semanticColumns: PrimaryTableCol<TableRowData>[] = [
  { colKey: "canonicalName", title: "名称", ellipsis: true },
  { colKey: "kind", title: "类型", width: 80 },
  { colKey: "type", title: "分类", width: 100, ellipsis: true },
  { colKey: "currentVersion", title: "版本", width: 70 },
  { colKey: "status", title: "状态", width: 90 },
];

async function loadSemanticObjects() {
  semanticLoading.value = true;
  try {
    const res = await sourceFoundationApi.semanticObjects({ projectId, page: 1, pageSize: 100 });
    semanticObjects.value = res.items;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载语义对象失败");
  } finally {
    semanticLoading.value = false;
  }
}

async function onSelectSemantic(context: RowEventContext<TableRowData>) {
  const row = context.row as SemanticObjectListItem;
  try {
    selectedSemantic.value = await sourceFoundationApi.semanticDetail(row.semanticObjectId, projectId);
    bindingReason.value = {};
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "加载详情失败");
  }
}

const pendingBindings = computed(() =>
  (selectedSemantic.value?.bindings ?? []).filter((b) => b.status === "pending"),
);

async function decideMention(binding: MentionBindingView, decision: "confirmed" | "rejected") {
  const reason = bindingReason.value[binding.bindingId];
  if (!reason || !selectedSemantic.value) return;
  try {
    await sourceFoundationApi.decideMention(binding.bindingId, {
      projectId,
      expectedVersion: 1,
      decision,
      reason,
      semanticObjectId: selectedSemantic.value.semanticObjectId,
    });
    MessagePlugin.success($t("workbench.sourceFoundation.facts.decisionRecorded"));
    bindingReason.value[binding.bindingId] = "";
    // refresh detail
    selectedSemantic.value = await sourceFoundationApi.semanticDetail(selectedSemantic.value.semanticObjectId, projectId);
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "决定失败");
  }
}

// ---- Issues section ----
const issues = ref<SourceIssue[]>([]);
const issueDrawerVisible = ref(false);

const openIssueCount = computed(() => issues.value.filter((i) => i.status === "open").length);

async function loadIssues() {
  try {
    const res = await sourceFoundationApi.issues({ projectId, page: 1, pageSize: 100, status: "open" });
    issues.value = res.items;
  } catch {
    issues.value = [];
  }
}

async function decideIssue({
  issue,
  decision,
  reason,
}: {
  issue: SourceIssue;
  decision: "resolved" | "accepted" | "dismissed";
  reason: string;
}) {
  try {
    await sourceFoundationApi.decideIssue(issue.issueId, { projectId, decision, reason });
    MessagePlugin.success($t("workbench.sourceFoundation.facts.decisionRecorded"));
    await loadIssues();
    await loadChapterFacts();
  } catch (e) {
    window.$message.error((e as Error)?.message ?? "决定失败");
  }
}

onMounted(() => {
  loadChapterFacts();
  loadSemanticObjects();
  loadIssues();
});
</script>

<style lang="scss" scoped>
.fact-registry-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.fact-registry-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 16px;
  align-items: start;
}
.grid-col {
  min-width: 0;
}
.title {
  font-weight: 600;
}
.empty {
  color: var(--td-text-color-secondary);
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
}
.muted {
  color: var(--td-text-color-secondary);
}
.small {
  font-size: 12px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.fact-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  .detail-head {
    display: flex;
    align-items: center;
    gap: 8px;
    .version {
      font-weight: 600;
    }
  }
  .section-label {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-bottom: 4px;
  }
  .kv {
    display: flex;
    gap: 12px;
    font-size: 13px;
  }
  .payload-pre {
    background: var(--td-bg-color-page);
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    max-height: 240px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
}
.semantic-detail {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  .binding-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-top: 1px solid var(--td-border-level-1-color);
    .mention {
      font-size: 12px;
      min-width: 80px;
    }
  }
}
.issue-bar {
  display: flex;
  justify-content: flex-end;
}
.edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
