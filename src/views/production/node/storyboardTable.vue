<template>
  <t-card class="storyboardTable">
    <div class="titleBar dragHandle pr">
      <div class="title c">{{ $t("workbench.production.node.storyboardTable.title") }}</div>
      <t-button size="small" variant="text" @click="openEdit">{{ $t("workbench.production.edit") }}</t-button>
      <Handle :id="props.handleIds.target" type="target" :position="Position.Left" style="left: calc(-1 * var(--td-comp-paddingLR-xl))" />
      <Handle :id="props.handleIds.source" type="source" :position="Position.Right" style="right: calc(-1 * var(--td-comp-paddingLR-xl))" />
    </div>
    <div class="storyboardList nowheel">
      <t-empty v-if="versions.length === 0" style="margin-top: 16px"></t-empty>
      <div v-else class="versionList">
        <div v-for="(ver, idx) in versions" :key="idx" class="versionItem">
          <div class="versionHeader" @click="toggleExpand(idx)">
            <div class="versionHeaderLeft">
              <i-chevron-right v-if="expandedIdx !== idx" class="chevron" />
              <i-chevron-down v-else class="chevron" />
              <span class="versionLabel">{{ $t("workbench.production.node.storyboardTable.version", { n: idx + 1 }) }}</span>
              <t-tag v-if="idx === activeIdx" theme="primary" variant="light" size="small" class="activeTag">
                {{ $t("workbench.production.node.storyboardTable.currentVersion") }}
              </t-tag>
            </div>
            <div class="versionHeaderRight" @click.stop>
              <t-button
                v-if="idx !== activeIdx"
                theme="primary"
                variant="outline"
                size="small"
                @click="applyVersion(idx)">
                {{ $t("workbench.production.node.storyboardTable.apply") }}
              </t-button>
              <t-button v-if="idx === activeIdx" theme="default" variant="text" size="small" @click="openEdit">
                {{ $t("workbench.production.edit") }}
              </t-button>
            </div>
          </div>
          <div v-show="expandedIdx === idx" class="versionContent">
            <MdPreview :model-value="ver" :theme="themeSetting.mode" />
          </div>
        </div>
      </div>
    </div>
  </t-card>

  <t-dialog
    v-model:visible="dialogVisible"
    :header="$t('workbench.production.node.storyboardTable.editDialog')"
    :width="'90vw'"
    :confirm-btn="$t('workbench.production.save')"
    :cancel-btn="$t('workbench.production.cancel')"
    @confirm="onConfirm"
    @cancel="onCancel"
    @close="onCancel"
    :close-on-overlay-click="false"
    placement="center"
    attach="body">
    <div class="editTip">
      <t-tag theme="warning" variant="light" size="small">
        {{ $t("workbench.production.node.storyboardTable.editLatestOnly", { n: activeIdx + 1 }) }}
      </t-tag>
    </div>
    <MdEditor
      v-model="editContent"
      :theme="themeSetting.mode"
      :toolbars="toolbars"
      :footers="[]"
      style="height: 72vh"
      @onUploadImg="() => {}"
      @drop.prevent
      @paste="onPaste" />
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { MdEditor, MdPreview } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
import productionAgentStore from "@/stores/productionAgent";
const { themeSetting } = storeToRefs(settingStore());

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
}>();

const versions = defineModel<string[]>({ required: true });

// 当前可编辑版本（"最后一个版本"）。默认为数组最后一个；可通过应用按钮切换。
const activeIdx = ref(0);
// 当前展开查看的版本索引（手风琴：同时只展开一个）。默认与 activeIdx 同步。
const expandedIdx = ref(0);

// 当 versions 变化时（如新增版本、初次加载），将 activeIdx/expandedIdx 指向最后一个版本
watch(
  () => versions.value.length,
  (len, oldLen) => {
    if (len > 0) {
      // 新增版本（len 增大）→ 切换到最后一个版本
      if (len > (oldLen ?? 0)) {
        activeIdx.value = len - 1;
        expandedIdx.value = len - 1;
      } else if (activeIdx.value >= len) {
        // 长度变短（理论上不会发生，兜底）
        activeIdx.value = len - 1;
        expandedIdx.value = Math.min(expandedIdx.value, len - 1);
      }
    }
  },
  { immediate: true },
);

const editContent = ref("");
const dialogVisible = ref(false);

const toolbars: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];

function toggleExpand(idx: number) {
  // 手风琴：点击展开的版本→折叠；点击折叠的版本→展开并折叠其他
  if (expandedIdx.value === idx) {
    expandedIdx.value = -1;
  } else {
    expandedIdx.value = idx;
  }
}

function openEdit() {
  // 编辑只编辑当前激活版本（默认最后一个）
  if (versions.value.length === 0) {
    versions.value.push("");
  }
  if (activeIdx.value >= versions.value.length) activeIdx.value = versions.value.length - 1;
  editContent.value = versions.value[activeIdx.value] ?? "";
  dialogVisible.value = true;
}

function onConfirm() {
  if (versions.value.length === 0) {
    versions.value.push(editContent.value);
  } else {
    versions.value[activeIdx.value] = editContent.value;
  }
  dialogVisible.value = false;
  productionAgentStore().setFlowData();
}

function onCancel() {
  dialogVisible.value = false;
}

function applyVersion(idx: number) {
  // 应用版本 idx：将该版本切换为"最后一个版本"（当前可编辑版本）
  // 同时展开该版本（手风琴：折叠其他）
  activeIdx.value = idx;
  expandedIdx.value = idx;
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
      e.preventDefault();
      return;
    }
  }
}
</script>

<style lang="scss" scoped>
.storyboardTable {
  max-width: 720px;
  width: 720px;
  min-width: 200px;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .storyboardList {
    display: flex;
    flex-direction: column;
    margin-top: 8px;
    max-height: 600px;
    overflow-y: auto;
    overflow-x: auto;

    :deep(.md-editor) {
      border: none;
      box-shadow: none;
    }

    :deep(.md-editor-preview-wrapper) {
      padding: 0;
    }

    :deep(table) {
      display: block;
      max-width: 100%;
      overflow-x: auto;
    }

    :deep(img) {
      max-width: 100%;
    }
  }

  .versionList {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .versionItem {
    border: 1px solid var(--td-border-level-1-color, #e7e7e7);
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .versionHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background-color: var(--td-bg-color-page, #f5f5f5);
    cursor: pointer;
    user-select: none;
  }

  .versionHeaderLeft {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chevron {
    font-size: 14px;
    color: var(--td-text-color-secondary, #999);
  }

  .versionLabel {
    font-size: 14px;
    font-weight: 500;
    color: var(--td-text-color-primary, #333);
  }

  .activeTag {
    margin-left: 4px;
  }

  .versionHeaderRight {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .versionContent {
    padding: 8px 4px;
    border-top: 1px solid var(--td-border-level-1-color, #e7e7e7);
  }
}

.editTip {
  margin-bottom: 8px;
}
</style>
