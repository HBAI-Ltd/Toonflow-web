<template>
  <div class="skillManagement">
    <div class="toolbar f w">
      <div class="leftTools">
        <t-button theme="danger" @click="scanSkills">
          <template #icon><t-icon name="refresh" /></template>
          {{ $t("settings.skill.scanSkills") }}
        </t-button>
        <t-button theme="primary" @click="openSkillEditor(null)">
          <template #icon><t-icon name="add" /></template>
          {{ $t("settings.skill.addSkill") }}
        </t-button>
        <t-button theme="default" variant="outline" @click="showImportSkill = !showImportSkill" v-if="false">
          <template #icon><t-icon name="upload" /></template>
          {{ $t("settings.skill.importFromHub") }}
        </t-button>
      </div>
      <div class="rightTools">
        <t-select v-model="filterType" :placeholder="$t('settings.skill.filterType')" clearable style="width: 120px" @change="getData">
          <t-option value="main" :label="$t('settings.skill.typeMain')" />
          <t-option value="references" :label="$t('settings.skill.typeReferences')" />
        </t-select>
        <t-select
          v-model="filterAttributions"
          :placeholder="$t('settings.skill.filterAttribution')"
          multiple
          clearable
          :options="attributionOptions"
          style="width: 200px"
          @change="getData" />
        <t-input v-model="searchText" :placeholder="$t('settings.skill.searchPlaceholder')" clearable style="width: 220px" @enter="getData" />
        <t-button theme="default" @click="getData">
          <template #icon><t-icon name="search" /></template>
          {{ $t("settings.skill.search") }}
        </t-button>
      </div>
    </div>

    <t-loading :loading="loading" class="skillLoading">
      <div class="table">
        <div class="info">{{ $t("settings.skill.totalCount", { count: pagination.total }) }}</div>
        <div class="item" v-for="(item, index) in tableData" :key="index">
          <div class="topInfo f ac jb">
            <div class="f ac">
              <div class="name">{{ item.type === "main" ? getAttributionLabel(item.path) : item.name }}</div>
              <div class="type f">
                <t-tag size="small" v-if="item.type == 'main'" theme="danger" variant="outline">{{ $t("settings.skill.typeMain") }}</t-tag>
                <t-tag size="small" v-if="item.type == 'references'" theme="success" variant="outline">{{ $t("settings.skill.typeReferences") }}</t-tag>
                <t-tag
                  size="small"
                  v-if="item.attributions && item.attributions.length > 0"
                  v-for="(attr, index) in item.attributions"
                  :key="index"
                  style="margin-right: 4px"
                  variant="outline">
                  {{ getAttributionLabel(attr) }}
                </t-tag>
                <template v-else-if="item.type !== 'main'">
                  <t-tag size="small" theme="danger">{{ $t("settings.skill.noAttribution") }}</t-tag>
                  <span>{{ $t("settings.skill.noAttributionTip") }}</span>
                </template>
                <span v-if="!item.embedding && item.type !== 'main'">{{ $t("settings.skill.noEmbeddingTip") }}</span>
              </div>
            </div>
            <div class="state">
              <template v-if="!item.embedding && item.type !== 'main'">
                <t-tag size="small" theme="danger">{{ $t("settings.skill.notEmbedded") }}</t-tag>
              </template>
              <template v-else>
                <t-tag size="small" v-if="item.state == 1 || item.type == 'main'" theme="success">{{ $t("settings.skill.stateNormal") }}</t-tag>
                <t-tag size="small" v-else-if="item.state == 0" theme="warning">{{ $t("settings.skill.stateGenerating") }}</t-tag>
                <t-tag size="small" v-else-if="item.state == -1" theme="danger">{{ $t("settings.skill.stateEmptyDesc") }}</t-tag>
                <t-tag size="small" v-else-if="item.state == -2" theme="danger">{{ $t("settings.skill.stateAttrError") }}</t-tag>
                <t-tag size="small" v-else-if="item.state == -3" theme="danger" variant="outline">{{ $t("settings.skill.stateMd5Changed") }}</t-tag>
              </template>
            </div>
          </div>
          <div class="md5">MD5：{{ item.md5 }}</div>
          <div class="path">路径：{{ item.path }}</div>
          <div class="description" v-if="item.type !== 'main'">{{ item.description }}</div>
          <div class="flootInfo f ac jb">
            <div class="createTime">{{ dayjs(item.createTime).format("YYYY-MM-DD HH:mm:ss") }}</div>
            <div class="btnList">
              <t-button
                theme="danger"
                variant="outline"
                size="small"
                v-if="!item.embedding && item.type !== 'main'"
                :loading="embeddingSkillIds.has(item.id)"
                @click="embeddingSkill(item)">
                <template #icon><i-coordinate-system /></template>
                {{ $t("settings.skill.embedding") }}
              </t-button>
              <t-button variant="text" size="small" @click="openSkillEditor(item)">
                <template #icon><t-icon name="edit" /></template>
                {{ $t("settings.skill.edit") }}
              </t-button>
              <t-button theme="danger" variant="text" size="small" @click="deleteSkill(item)" v-if="item.type !== 'main'">
                <template #icon><t-icon name="delete" /></template>
                {{ $t("settings.skill.delete") }}
              </t-button>
            </div>
          </div>
        </div>
      </div>
      <t-pagination
        v-model:current="pagination.current"
        v-model:pageSize="pagination.pageSize"
        class="paginationWrap"
        :total="pagination.total"
        show-sizer
        @current-change="getData"
        @page-size-change="getData" />
    </t-loading>
  </div>
  <t-dialog placement="top" :header="$t('settings.skill.importFromHubDialog')" v-model:visible="showImportSkill">
    <div class="inputBox f ac">
      <span class="title">{{ $t("settings.skill.shareLink") }}</span>
      <t-input v-model="shareUrl"></t-input>
    </div>
    <div class="tips" @click="jumpToonflowHub">
      Toonflow-Hub
      <i-share theme="outline" />
    </div>
  </t-dialog>
  <!-- 新增 / 编辑 统一弹窗 -->
  <t-dialog
    v-model:visible="editorVisible"
    :header="isEdit ? `${$t('settings.skill.editSkillTitle')}${editorForm.name}` : $t('settings.skill.addSkillTitle')"
    :confirm-btn="null"
    :cancel-btn="null"
    placement="center"
    width="90vw"
    top="3vh"
    :close-on-overlay-click="false">
    <div class="editorDialogContent">
      <div class="editorBody">
        <div class="editorSidebar" v-if="editorForm.type !== 'main'">
          <t-form labelAlign="top">
            <t-form-item :label="$t('settings.skill.skillName')">
              <t-input v-model="editorForm.name" :placeholder="$t('settings.skill.skillNamePlaceholder')" />
            </t-form-item>
            <t-form-item :label="$t('settings.skill.path')" v-if="editorForm.path">
              <t-input v-model="editorForm.path" disabled />
            </t-form-item>
            <t-form-item :label="$t('settings.skill.attributionAgent')">
              <t-select v-model="editorForm.attributions" multiple :options="attributionOptions" :placeholder="$t('settings.skill.selectAttribution')" />
            </t-form-item>
            <t-form-item class="descItem">
              <template #label>
                <div class="descLabel">
                  <span>{{ $t("settings.skill.description") }}</span>
                  <t-button
                    theme="primary"
                    size="small"
                    :loading="generatingDescription"
                    :disabled="!editorForm.content.trim()"
                    @click="generateDescription">
                    <template #icon><i-star /></template>
                    {{ $t("settings.skill.aiGenerate") }}
                  </t-button>
                </div>
              </template>
              <t-textarea
                v-model="editorForm.description"
                :autosize="false"
                :disabled="generatingDescription"
                :placeholder="$t('settings.skill.descriptionPlaceholder')"
                class="descTextarea" />
            </t-form-item>
          </t-form>
        </div>
        <div class="editorMain">
          <MdEditor
            v-model="editorForm.content"
            theme="light"
            :toolbars="mdToolbars"
            :footers="[]"
            class="mdEditorFull"
            @onUploadImg="() => {}"
            @drop.prevent
            @paste="onMdPaste" />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="editorFooter">
        <t-button theme="default" @click="editorVisible = false">{{ $t("settings.skill.cancel") }}</t-button>
        <t-button theme="primary" @click="saveSkill">
          {{ isEdit ? $t("settings.skill.save") : $t("settings.skill.createSkill") }}
        </t-button>
      </div>
    </template>
  </t-dialog>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { MdEditor } from "md-editor-v3";
import type { ToolbarNames } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import axios from "@/utils/axios";

const searchText = ref(""); //搜索值
const filterType = ref(""); //类型筛选
const filterAttributions = ref([]); //归属筛选
const shareUrl = ref(""); //分享链接
const editorVisible = ref(false); //编辑弹窗显示
const isEdit = ref(false); //是否编辑
const generatingDescription = ref(false); //AI生成描述中

const loading = ref(false);
const showImportSkill = ref(false);
const embeddingSkillIds = ref<Set<string>>(new Set());

const editorForm = ref({
  id: "",
  name: "",
  path: "",
  type: "",
  description: "",
  content: "",
  attributions: [],
});

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

type SkillAttribution =
  | "production_agent_decision.md"
  | "production_agent_execution.md"
  | "production_agent_supervision.md"
  | "script_agent_decision.md"
  | "script_agent_execution.md"
  | "script_agent_supervision.md"
  | "universal_agent.md";

const attributionOptions = [
  { value: "production_agent_decision.md", label: $t("settings.skill.attr.productionDecision") },
  { value: "production_agent_execution.md", label: $t("settings.skill.attr.productionExecution") },
  { value: "production_agent_supervision.md", label: $t("settings.skill.attr.productionSupervision") },
  { value: "script_agent_decision.md", label: $t("settings.skill.attr.scriptDecision") },
  { value: "script_agent_execution.md", label: $t("settings.skill.attr.scriptExecution") },
  { value: "script_agent_supervision.md", label: $t("settings.skill.attr.scriptSupervision") },
  { value: "universal_agent.md", label: $t("settings.skill.attr.universalAgent") },
];

interface SkillListItem {
  id: string;
  md5: string;
  path: string;
  type: string;
  name: string;
  description: string;
  attributions: SkillAttribution[];
  state: number;
  createTime: number;
  embedding: boolean;
}

const tableData = ref<SkillListItem[]>([]);

async function scanSkills() {
  const { data } = await axios.post("/setting/skillManagement/scanSkills");
  window.$message.success($t("settings.skill.msg.scanSuccess", { count: data.totalFiles }));
  getData();
}

async function getData() {
  loading.value = true;
  try {
    const { data }: { data: { list: SkillListItem[]; total: number } } = await axios.post("/setting/skillManagement/getSkillList", {
      page: pagination.value.current,
      limit: pagination.value.pageSize,
      search: searchText.value,
      type: filterType.value || undefined,
      attributions: filterAttributions.value.length ? filterAttributions.value : undefined,
    });

    tableData.value = data.list;
    pagination.value.total = Number(data.total);
  } catch (error: any) {
    window.$message.error(error?.message || $t("settings.skill.msg.fetchListFailed"));
    tableData.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
}

function getAttributionLabel(value: string): string {
  return attributionOptions.find((o) => o.value === value)?.label || value;
}

function jumpToonflowHub() {
  window.open("https://hub.toonflow.net/skills");
}

const mdToolbars: ToolbarNames[] = [
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

function onMdPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
      e.preventDefault();
      return;
    }
  }
}

async function generateDescription() {
  const content = editorForm.value.content.trim();
  if (!content) {
    window.$message.warning($t("settings.skill.msg.fillContentFirst"));
    return;
  }
  generatingDescription.value = true;
  try {
    const { data } = await axios.post("/setting/skillManagement/generateDescription", {
      content,
    });
    editorForm.value.description = data || "";
    window.$message.success($t("settings.skill.msg.descGenSuccess"));
  } catch (error: any) {
    window.$message.error(error?.message || $t("settings.skill.msg.descGenFailed"));
  } finally {
    generatingDescription.value = false;
  }
}

async function saveSkill() {
  if (!editorForm.value.name.trim()) {
    window.$message.warning($t("settings.skill.msg.fillNameFirst"));
    return;
  }
  if (!editorForm.value.content.trim()) {
    window.$message.warning($t("settings.skill.msg.fillContentFirst"));
    return;
  }
  try {
    if (isEdit.value) {
      await axios.post("/setting/skillManagement/updateSkill", {
        id: editorForm.value.id,
        name: editorForm.value.name,
        description: editorForm.value.description,
        content: editorForm.value.content,
        attributions: editorForm.value.attributions,
      });
      window.$message.success($t("settings.skill.msg.updateSuccess"));
    } else {
      await axios.post("/setting/skillManagement/addSkill", {
        name: editorForm.value.name,
        description: editorForm.value.description,
        content: editorForm.value.content,
        attributions: editorForm.value.attributions,
      });
      window.$message.success($t("settings.skill.msg.createSuccess"));
    }
    editorVisible.value = false;
    getData();
  } catch (error: any) {
    window.$message.error(error?.message || (isEdit.value ? $t("settings.skill.msg.updateFailed") : $t("settings.skill.msg.createFailed")));
  }
}

async function deleteSkill(row: SkillListItem) {
  const dialog = DialogPlugin.confirm({
    header: $t("settings.skill.msg.deleteConfirmTitle"),
    body: $t("settings.skill.msg.deleteConfirmBody", { name: row.name }),
    onConfirm: async () => {
      try {
        await axios.post("/setting/skillManagement/deleteSkill", { id: row.id });
        window.$message.success($t("settings.skill.msg.deleteSuccess"));
        getData();
      } catch (error: any) {
        window.$message.error(error?.message || $t("settings.skill.msg.deleteFailed"));
      }
      dialog.destroy();
    },
  });
}

async function openSkillEditor(row: any) {
  if (row) {
    isEdit.value = true;
    editorForm.value = {
      id: row.id,
      name: row.name,
      path: row.path,
      type: row.type,
      description: row.description,
      content: row.content,
      attributions: row.attributions,
    };
  } else {
    isEdit.value = false;
    editorForm.value = {
      id: "",
      name: "",
      path: "",
      type: "",
      description: "",
      content: "",
      attributions: [],
    };
  }
  editorVisible.value = true;
}

async function embeddingSkill(row: SkillListItem) {
  embeddingSkillIds.value.add(row.id);
  try {
    await axios.post("/setting/skillManagement/embeddingSkill", { id: row.id });
    window.$message.success($t("settings.skill.msg.embeddingSuccess"));
    getData();
  } catch (error: any) {
    window.$message.error(error?.message || $t("settings.skill.msg.embeddingFailed"));
  } finally {
    embeddingSkillIds.value.delete(row.id);
  }
}

onMounted(() => {
  getData();
});
</script>

<style lang="scss" scoped>
.skillManagement {
  .toolbar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    .leftTools {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .rightTools {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }
  .table {
    border: 1px solid var(--td-component-border);
    border-radius: var(--td-radius-default);
    .info {
      background: #f6f6f6;
      padding: 16px;
      border-bottom: 1px solid var(--td-component-border);
    }
    .item {
      border-bottom: 1px solid var(--td-component-border);
      height: 100%;
      max-height: 200px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      &:hover {
        background: #f9f9f9;
      }
      .topInfo {
        .name {
          font-weight: bold;
        }
        .type {
          display: flex;
          gap: 4px;
          margin-left: 8px;
        }
      }
      .md5 {
        font-size: 12px;
      }
      .path {
        opacity: 0.7;
        font-size: 12px;
      }
      .description {
        margin-top: 8px;
        margin-bottom: 8px;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 4;
      }
      .flootInfo {
        .createTime {
          font-size: 12px;
        }
        .btnList {
          display: flex;
          gap: 4px;
        }
      }
    }
  }
  .paginationWrap {
    margin-top: 16px;
  }
  .skillLoading {
    width: 100%;
    margin-top: 16px;
  }
  .inputBox {
    .title {
      white-space: nowrap;
      margin-right: 16px;
      font-size: 16px;
      font-weight: 500;
      color: #000;
    }
  }
  .tips {
    cursor: pointer;
    margin-top: 16px;
    color: #339af0;
    &:hover {
      text-decoration: underline;
      color: #4263eb;
    }
  }
}
.editorDialogContent {
  min-height: 68vh;
  .editorBody {
    display: flex;
    gap: 16px;
    height: 68vh;
    .editorSidebar {
      width: 260px;
      min-width: 220px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;

      :deep(.t-form) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      :deep(.descItem) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;

        .t-form__controls,
        .t-form__controls-content,
        .t-form__content {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
      }

      .descTextarea {
        flex: 1;
        min-height: 0;

        :deep(.t-textarea) {
          height: 100%;
        }

        :deep(.t-textarea__inner) {
          height: 100% !important;
          min-height: 100% !important;
          resize: none;
        }
      }

      .descLabel {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;

        :deep(.t-button) {
          padding: 0 4px;
          height: 22px;
          font-size: 12px;
        }
      }
    }
    .editorMain {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;

      .mdEditorFull {
        flex: 1;
        height: 100%;
      }
    }
  }
}
.editorFooter {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
