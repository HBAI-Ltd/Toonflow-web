<template>
  <div class="source-package-step">
    <t-card class="package-panel" :bordered="true" :header-bordered="true">
      <template #header>
        <span class="title">{{ $t("workbench.sourceFoundation.package.title") }}</span>
      </template>
      <div v-if="!catalog" class="empty">{{ $t("workbench.sourceFoundation.package.noCatalog") }}</div>
      <div v-else-if="!items.length" class="empty">{{ $t("workbench.sourceFoundation.package.noItems") }}</div>
      <div v-else class="package-grid">
        <t-card
          v-for="item in items"
          :key="item.id"
          class="package-cell"
          :bordered="true"
          :header-bordered="true"
        >
          <template #header>
            <div class="cell-head">
              <span class="ep">#{{ item.episodeNumber }} {{ item.title }}</span>
              <t-tag
                v-if="packageByItem[item.id]"
                size="small"
                :theme="packageStatusTheme(packageByItem[item.id].status)"
                variant="light"
              >
                {{ $t(`workbench.sourceFoundation.package.status.${packageByItem[item.id].status}`) }}
              </t-tag>
              <t-tag v-else size="small" variant="outline">{{ $t("workbench.sourceFoundation.package.noPackage") }}</t-tag>
            </div>
          </template>

          <div class="cell-body">
            <div class="range">
              {{ $t("workbench.sourceFoundation.catalog.startOrderIndex") }}: {{ item.startOrderIndex }} /
              {{ $t("workbench.sourceFoundation.catalog.endOrderIndex") }}: {{ item.endOrderIndex }}
            </div>
            <div v-if="packageByItem[item.id]" class="pkg-meta">
              <span class="meta">v{{ packageByItem[item.id].version }}</span>
              <span v-if="packageByItem[item.id].contentHash" class="meta hash">
                {{ packageByItem[item.id].contentHash?.slice(0, 10) }}…
              </span>
              <span v-if="packageByItem[item.id].lockedAt" class="meta">
                {{ formatTime(packageByItem[item.id].lockedAt!) }}
              </span>
            </div>

            <div class="cell-actions">
              <t-button
                v-if="canBuild(item)"
                size="small"
                theme="primary"
                :loading="buildingByItem[item.id]"
                @click="buildPackage(item)"
              >
                {{ $t("workbench.sourceFoundation.package.build") }}
              </t-button>
              <t-button
                v-if="packageByItem[item.id]"
                size="small"
                variant="outline"
                @click="loadDetail(item)"
              >
                {{ $t("workbench.sourceFoundation.package.review") }}
              </t-button>
              <t-button
                v-if="packageByItem[item.id]?.status === 'review_required'"
                size="small"
                theme="primary"
                :loading="lockingByItem[item.id]"
                @click="lockPackage(item)"
              >
                {{ $t("workbench.sourceFoundation.package.lock") }}
              </t-button>
              <t-button
                v-if="packageByItem[item.id]?.status === 'locked_valid'"
                size="small"
                theme="success"
                @click="enterStage2(item)"
              >
                {{ $t("workbench.sourceFoundation.package.enterStage2") }}
              </t-button>
            </div>

            <div v-if="findingsByItem[item.id]?.length" class="findings">
              <div class="section-label">{{ $t("workbench.sourceFoundation.package.findings") }}</div>
              <div v-for="(f, idx) in findingsByItem[item.id]" :key="idx" class="finding">
                <t-tag size="small" :theme="severityTheme(f.severity)" variant="light">{{ f.severity }}</t-tag>
                <span class="code">{{ f.code }}</span>
                <span class="msg">{{ f.message }}</span>
              </div>
            </div>
          </div>
        </t-card>
      </div>
    </t-card>

    <t-dialog
      v-model:visible="detailVisible"
      :header="detailHeader"
      width="900px"
      :footer="false"
    >
      <div v-if="detail" class="detail-tabs">
        <t-tabs v-model="activeTab" theme="card">
          <t-tab-panel value="summary" :label="$t('workbench.sourceFoundation.package.tabs.summary')">
            <div v-if="detail.payload" class="tab-body">
              <div class="kv">
                <span>{{ $t("workbench.sourceFoundation.package.episode") }}: #{{ detail.payload.episode.episodeNumber }} {{ detail.payload.episode.title }}</span>
                <span>{{ $t("workbench.sourceFoundation.package.range") }}: {{ detail.payload.episode.chapterRange.startChapterIndex }} - {{ detail.payload.episode.chapterRange.endChapterIndex }}</span>
              </div>
              <div class="section-label">{{ $t("workbench.sourceFoundation.package.navigationSummary") }}</div>
              <pre class="payload-pre">{{ detail.payload.navigationSummary }}</pre>
            </div>
          </t-tab-panel>
          <t-tab-panel value="facts" :label="$t('workbench.sourceFoundation.package.tabs.facts') + ` (${detail.payload?.facts.length ?? 0})`">
            <pre class="payload-pre">{{ JSON.stringify(detail.payload?.facts ?? [], null, 2) }}</pre>
          </t-tab-panel>
          <t-tab-panel value="semantics" :label="$t('workbench.sourceFoundation.package.tabs.semantics') + ` (${detail.payload?.semantics.length ?? 0})`">
            <pre class="payload-pre">{{ JSON.stringify(detail.payload?.semantics ?? [], null, 2) }}</pre>
          </t-tab-panel>
          <t-tab-panel value="relations" :label="$t('workbench.sourceFoundation.package.tabs.relations') + ` (${detail.payload?.relations.length ?? 0})`">
            <pre class="payload-pre">{{ JSON.stringify(detail.payload?.relations ?? [], null, 2) }}</pre>
          </t-tab-panel>
          <t-tab-panel value="risks" :label="$t('workbench.sourceFoundation.package.tabs.risks') + ` (${detail.payload?.acceptedRisks.length ?? 0})`">
            <pre class="payload-pre">{{ JSON.stringify(detail.payload?.acceptedRisks ?? [], null, 2) }}</pre>
          </t-tab-panel>
          <t-tab-panel value="manifest" :label="$t('workbench.sourceFoundation.package.tabs.manifest')">
            <pre class="payload-pre">{{ JSON.stringify(detail.dependencyManifest ?? {}, null, 2) }}</pre>
          </t-tab-panel>
        </t-tabs>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import projectStore from "@/stores/project";
import { sourceFoundationApi } from "@/api/sourceFoundation";
import type { CatalogDetail, CatalogItem, PackageDetail, SourceIssue } from "@/types/sourceFoundation";
import { useSourceFoundationStore } from "@/stores/sourceFoundation";
import { useRouter } from "vue-router";

const projectId = Number(projectStore().project?.id);
const store = useSourceFoundationStore(projectId);
const router = useRouter();

const catalog = ref<CatalogDetail | null>(null);
const items = computed(() => catalog.value?.items ?? []);

// Lightweight package row per catalog item: minimal subset of PackageDetail
// needed for status/badge display and gating.
interface PackageRow {
  packageId: string;
  catalogItemId: string;
  version: number;
  status: string;
  contentHash: string | null;
  lockedAt: number | null;
}
const packageByItem = ref<Record<string, PackageRow>>({});
const findingsByItem = ref<Record<string, PackageDetail["auditFindings"]>>({});
const buildingByItem = ref<Record<string, boolean>>({});
const lockingByItem = ref<Record<string, boolean>>({});

async function reloadCatalog() {
  if (!store.selectedBatchId) {
    catalog.value = null;
    return;
  }
  try {
    catalog.value = await sourceFoundationApi.catalogCurrent({ projectId, batchId: store.selectedBatchId });
    store.selectedCatalogId = catalog.value?.id ?? null;
    packageByItem.value = {};
    findingsByItem.value = {};
    // After reload, refresh locked package list to surface any locked_valid packages.
    await refreshLockedRows();
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.catalog.loadFailed"));
  }
}

async function refreshLockedRows() {
  if (!items.value.length) return;
  try {
    const res = await sourceFoundationApi.listLockedPackages({ projectId, page: 1, pageSize: 100 });
    const lockedByItem: Record<string, PackageRow> = {};
    for (const row of res.items) {
      lockedByItem[row.catalogItemId] = {
        packageId: row.packageId,
        catalogItemId: row.catalogItemId,
        version: row.version,
        status: "locked_valid",
        contentHash: row.contentHash,
        lockedAt: row.lockedAt,
      };
    }
    // Merge: don't overwrite rows we've already loaded with richer detail.
    for (const item of items.value) {
      if (!packageByItem.value[item.id] && lockedByItem[item.id]) {
        packageByItem.value[item.id] = lockedByItem[item.id];
      }
    }
  } catch {
    // Non-fatal: list endpoint unavailable → users still drive build/refresh per item.
  }
}

function canBuild(item: CatalogItem) {
  return item.status === "valid" || item.status === "reconfirm";
}

function packageStatusTheme(status: string) {
  if (status === "locked_valid") return "success";
  if (status === "review_required") return "primary";
  if (status === "blocked" || status === "build_failed" || status === "rebuild_required") return "danger";
  if (status === "building") return "warning";
  return "default";
}

function severityTheme(severity: string) {
  if (severity === "blocker") return "danger";
  if (severity === "confirm") return "warning";
  return "default";
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleString();
}

async function buildPackage(item: CatalogItem) {
  buildingByItem.value[item.id] = true;
  try {
    const res = await sourceFoundationApi.packageBuild(item.id, { projectId });
    packageByItem.value[item.id] = {
      packageId: res.packageId,
      catalogItemId: item.id,
      version: 1,
      status: "building",
      contentHash: null,
      lockedAt: null,
    };
    window.$message.success($t("workbench.sourceFoundation.package.buildStarted"));
    await store.refreshOverview();
    store.pollWhileActive();
    pollBuildStatus(item.id, res.packageId);
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.package.buildFailed"));
  } finally {
    buildingByItem.value[item.id] = false;
  }
}

let pollTimer: number | undefined;
function stopPolling() {
  if (pollTimer !== undefined) window.clearTimeout(pollTimer);
  pollTimer = undefined;
}

async function pollBuildStatus(catalogItemId: string, packageId: string) {
  stopPolling();
  try {
    const detail = await sourceFoundationApi.packageGet(packageId, projectId);
    packageByItem.value[catalogItemId] = {
      packageId: detail.packageId,
      catalogItemId,
      version: detail.version,
      status: detail.status,
      contentHash: detail.contentHash,
      lockedAt: detail.lockedAt,
    };
    if (detail.auditFindings) findingsByItem.value[catalogItemId] = detail.auditFindings;
    if (document.hidden || !["building"].includes(detail.status)) return;
  } catch {
    // ignore transient errors during polling
  }
  pollTimer = window.setTimeout(() => pollBuildStatus(catalogItemId, packageId), 2000);
}

// ---- Detail dialog ----
const detailVisible = ref(false);
const detail = ref<PackageDetail | null>(null);
const activeTab = ref("summary");
const detailHeader = computed(() =>
  detail.value ? `${$t("workbench.sourceFoundation.package.detailTitle")} v${detail.value.version}` : "",
);

async function loadDetail(item: CatalogItem) {
  const row = packageByItem.value[item.id];
  if (!row) return;
  try {
    detail.value = await sourceFoundationApi.packageGet(row.packageId, projectId);
    if (detail.value.auditFindings) findingsByItem.value[item.id] = detail.value.auditFindings;
    activeTab.value = "summary";
    detailVisible.value = true;
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.package.loadFailed"));
  }
}

async function lockPackage(item: CatalogItem) {
  const row = packageByItem.value[item.id];
  if (!row || row.status !== "review_required") return;
  const unresolvedBlockers = issues.value.filter(
    (i) => i.severity === "blocker" && i.status === "open",
  );
  if (unresolvedBlockers.length) {
    window.$message.error($t("workbench.sourceFoundation.package.blockersOpen"));
    return;
  }
  // Need fresh detail to read inputFingerprint + version.
  lockingByItem.value[item.id] = true;
  try {
    const fresh = await sourceFoundationApi.packageGet(row.packageId, projectId);
    const res = await sourceFoundationApi.lockPackage(fresh.packageId, {
      projectId,
      expectedVersion: fresh.version,
      inputFingerprint: fresh.inputFingerprint,
    });
    packageByItem.value[item.id] = {
      ...row,
      version: res.version,
      contentHash: res.contentHash,
      status: "locked_valid",
      lockedAt: Date.now(),
    };
    window.$message.success($t("workbench.sourceFoundation.package.locked"));
    await store.refreshOverview();
  } catch (e) {
    window.$message.error((e as Error)?.message ?? $t("workbench.sourceFoundation.package.lockFailed"));
  } finally {
    lockingByItem.value[item.id] = false;
  }
}

function enterStage2(item: CatalogItem) {
  const row = packageByItem.value[item.id];
  if (!row || row.status !== "locked_valid") return;
  sessionStorage.setItem(`sourcePackage:${projectId}`, row.packageId);
  store.selectedPackageId = row.packageId;
  router.push("/scriptAgent");
}

// ---- Issues (for blocker gate) ----
const issues = ref<SourceIssue[]>([]);

async function loadIssues() {
  try {
    const res = await sourceFoundationApi.issues({ projectId, page: 1, pageSize: 100, status: "open" });
    issues.value = res.items;
  } catch {
    issues.value = [];
  }
}

onMounted(async () => {
  await store.refreshOverview();
  store.selectedBatchId ??= store.overview?.batch.currentId ?? null;
  await reloadCatalog();
  await loadIssues();
});

onUnmounted(() => {
  stopPolling();
  store.stopPolling();
});
</script>

<style lang="scss" scoped>
.source-package-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.package-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.package-cell {
  min-width: 0;
  .cell-head {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    .ep {
      font-weight: 600;
      font-size: 13px;
    }
  }
  .cell-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
    .range {
      color: var(--td-text-color-secondary);
      font-size: 12px;
    }
    .pkg-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 12px;
      .hash {
        font-family: var(--td-font-family-code, monospace);
      }
    }
    .cell-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
  }
}
.findings {
  margin-top: 4px;
  .section-label {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-bottom: 4px;
  }
  .finding {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    font-size: 12px;
    .code {
      font-weight: 600;
    }
    .msg {
      color: var(--td-text-color-secondary);
    }
  }
}
.detail-tabs {
  .tab-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    .kv {
      display: flex;
      gap: 16px;
      font-size: 13px;
    }
  }
  .section-label {
    font-size: 12px;
    color: var(--td-text-color-secondary);
    margin-bottom: 4px;
  }
}
.payload-pre {
  background: var(--td-bg-color-page);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
