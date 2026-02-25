<template>
  <div class="element-manager">
    <!-- 头部 -->
    <div class="header">
      <div class="header-content">
        <div class="icon-wrapper">
          <i-ad-product :size="24" />
        </div>
        <div class="header-text">
          <h3 class="title">资产管理</h3>
          <p class="subtitle">管理场景、角色、道具、分镜资源库</p>
        </div>
      </div>
      <div class="header-stats" v-if="projectElements.length">
        <div class="stat-item">
          <span class="stat-value">{{ projectElements.length }}</span>
          <span class="stat-label">{{ currentLabel }}数量</span>
        </div>
      </div>
    </div>

    <!-- 视觉风格选择（影响资产生成与分镜图风格统一） -->
    <div class="visual-style-bar">
      <span class="visual-style-label">视觉风格</span>
      <a-radio-group
        v-model:value="visualStyleValue"
        option-type="button"
        size="small"
        :options="visualStyleOptions"
        @change="onVisualStyleChange" />
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="tab-group" v-if="!props.radio">
        <button
          v-for="item in radioOptions"
          :key="item.value"
          :class="['tab-btn', { active: currentFilter === item.value }]"
          @click="changeFilter(item.value)">
          <component :is="getTabIcon(item.value)" :size="16" />
          <span>{{ item.label }}</span>
        </button>
      </div>
      <div class="actions">
        <template v-if="props.batch">
          <button class="action-btn secondary" :disabled="batchPromptLoading" @click="handleBatchGeneratePrompt">
            <i-magic :size="16" />
            <span>{{ batchPromptLoading ? "处理中..." : "批量润色" }}</span>
          </button>
          <button class="action-btn primary" :disabled="batchImageLoading" @click="handleBatchGeneration">
            <i-pic :size="16" />
            <span>{{ batchImageLoading ? "生成中..." : "批量生成图片" }}</span>
          </button>
        </template>
        <template v-else-if="!props.way">
          <button class="action-btn secondary" @click="batchShow = true">
            <i-layers :size="16" />
            <span>批量生成</span>
          </button>
          <button class="action-btn primary" :disabled="!canAddElement" @click="addElement">
            <i-plus :size="16" />
            <span>新增{{ currentLabel }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content-body">
      <a-spin :spinning="filterLoading" tip="加载中...">
        <!-- 分镜脚本选择 -->
        <div v-if="currentFilter === 'storyboard' && scriptList.length" class="script-selector">
          <div class="script-label">
            <i-editor :size="16" />
            <span>选择剧本</span>
          </div>
          <div class="script-list">
            <button
              v-for="script in scriptList"
              :key="script.id"
              :class="['script-btn', { active: currentScriptId === script.id }]"
              @click="handleScriptChange(script)">
              {{ script.name }}
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!filterLoading && !projectElements.length" class="empty-state">
          <div class="empty-icon">
            <i-ad-product :size="56" />
          </div>
          <h3 class="empty-title">暂无{{ currentLabel }}元素</h3>
          <p class="empty-desc">点击右上角"新增{{ currentLabel }}"按钮添加，或根据剧本批量生成</p>
          <button v-if="!props.way && canAddElement" class="empty-action" @click="addElement">
            <i-plus :size="18" />
            <span>新增{{ currentLabel }}</span>
          </button>
        </div>

        <!-- 数据表格 -->
        <div v-else class="table-wrapper">
          <vxe-table
            ref="tableRef"
            :data="projectElements"
            :cell-config="{ height: props.batch ? 300 : 140 }"
            :row-config="{ keyField: 'id', resizable: true }"
            :radio-config="{ reserve: true }"
            :checkbox-config="{ reserve: true }"
            round
            stripe
            @checkbox-all="handleCheckedAll"
            @checkbox-change="handleCheckedChange">
            <vxe-column v-if="props.way" :type="props.way" title="选择" width="80" align="center" />

            <vxe-column title="名称" field="name" width="160" show-overflow="title" :edit-render="{ name: 'input' }">
              <template #default="{ row }">
                <div class="name-cell">
                  <span class="name-text">{{ row.name || "未命名" }}</span>
                </div>
              </template>
            </vxe-column>

            <vxe-column title="预览图" width="140" align="center">
              <template #default="{ row }">
                <div class="image-cell">
                  <a-image v-if="row.filePath" :src="row.filePath" :fallback="errorPicture" class="preview-image" />
                  <div v-else class="no-image">
                    <i-pic :size="24" />
                    <span>待生成</span>
                  </div>
                </div>
              </template>
            </vxe-column>

            <vxe-column title="描述" field="intro" min-width="180" show-overflow="title" :edit-render="{ name: 'textarea' }">
              <template #default="{ row }">
                <p class="desc-text">{{ row.intro || "暂无描述" }}</p>
              </template>
            </vxe-column>

            <vxe-column title="生图提示词" field="prompt" min-width="200" show-overflow="title">
              <template #default="{ row }">
                <template v-if="props.batch">
                  <a-textarea
                    v-model:value="row.prompt"
                    :auto-size="{ minRows: 3, maxRows: 10 }"
                    placeholder="输入生图提示词..."
                    class="prompt-textarea" />
                </template>
                <p v-else class="prompt-text">{{ row.prompt || "暂无提示词" }}</p>
              </template>
            </vxe-column>

            <vxe-column
              v-if="currentFilter === 'role'"
              title="音色"
              field="voiceId"
              width="140"
              show-overflow="title">
              <template #default="{ row }">
                <p class="remark-text">{{ row.voiceId || "-" }}</p>
              </template>
            </vxe-column>

            <vxe-column v-if="currentFilter === 'storyboard'" title="视频提示词" field="videoPrompt" min-width="200" show-overflow="title">
              <template #default="{ row }">
                <template v-if="props.batch">
                  <a-textarea
                    v-model:value="row.videoPrompt"
                    :auto-size="{ minRows: 3, maxRows: 10 }"
                    placeholder="输入视频提示词..."
                    class="prompt-textarea" />
                </template>
                <p v-else class="prompt-text">{{ row.videoPrompt || "暂无提示词" }}</p>
              </template>
            </vxe-column>

            <vxe-column
              v-if="currentFilter === 'storyboard'"
              title="人物对话"
              field="dialogue"
              min-width="180"
              show-overflow="title">
              <template #default="{ row }">
                <p class="remark-text">{{ row.dialogue || "-" }}</p>
              </template>
            </vxe-column>

            <vxe-column
              v-if="currentFilter === 'storyboard'"
              title="第三方叙述"
              field="narration"
              min-width="200"
              show-overflow="title">
              <template #default="{ row }">
                <p class="remark-text">{{ row.narration || "-" }}</p>
              </template>
            </vxe-column>

            <vxe-column title="备注" field="remark" width="150" :edit-render="{ name: 'textarea' }">
              <template #default="{ row }">
                <p class="remark-text">{{ row.remark || "-" }}</p>
              </template>
            </vxe-column>

            <vxe-column v-if="currentFilter === 'storyboard'" title="时长" field="duration" width="100" align="center">
              <template #default="{ row }">
                <span class="duration-badge">{{ row.duration || 0 }}s</span>
              </template>
            </vxe-column>

            <vxe-column v-if="!props.batch" title="操作" width="140" fixed="right" align="center">
              <template #default="{ row }">
                <div class="action-cell">
                  <button class="icon-btn edit" title="编辑" @click="editForm(row)">
                    <i-pencil :size="18" />
                  </button>
                  <button class="icon-btn magic" title="AI生成" @click="aiGenerate(row)">
                    <i-magic :size="18" />
                  </button>
                  <button class="icon-btn delete" title="删除" @click="deleteFrom(row)">
                    <i-delete :size="18" />
                  </button>
                </div>
              </template>
            </vxe-column>
          </vxe-table>
        </div>
      </a-spin>
    </div>

    <!-- 弹窗组件 -->
    <addElementDialog
      v-model="addDialogShow"
      :type="currentFilter"
      :scriptId="currentScriptId!"
      :data="currentRow"
      @update="changeFilter(currentFilter)" />
    <generateImage v-model="imageDialogShow" :data="currentRow" @update="changeFilter(currentFilter)" />
    <batchGenereate
      v-if="batchGenereate"
      v-model="batchShow"
      :data="projectElements"
      :type="currentFilter"
      :script-id="currentScriptId ?? -1"
      @save="handleBatchSave" />
  </div>
</template>

<script setup lang="ts">
import { message, Modal } from "ant-design-vue";
import type { VxeTableInstance } from "vxe-table";
import axios from "@/utils/axios";
import errorPicture from "@/utils/error";
import addElementDialog from "./components/addElementDialog.vue";
import batchGenereate from "./components/batchGenereate.vue";
import generateImage from "./components/generateImage.vue";
import store from "@/stores";

const { projectId, currentScriptId, project } = storeToRefs(store());

interface ElementData {
  id: number;
  filePath: string;
  intro: string;
  name: string;
  prompt: string;
  remark: string;
  duration: number;
  type: string;
  videoPrompt: string;
  dialogue?: string;
  narration?: string;
  voiceId?: string;
}

interface ScriptItem {
  id: number;
  name: string;
}

type FilterType = "role" | "scene" | "props" | "storyboard";

const props = defineProps<{
  way?: "radio" | "checkbox";
  radio?: FilterType;
  batch?: boolean;
}>();

const emits = defineEmits<{
  checkChange: [{ checked: boolean; row: ElementData }];
  checkAll: [{ checked: boolean; records: ElementData[] }, FilterType, number];
}>();

const selectModal = defineModel<ElementData[]>();

const tableRef = ref<VxeTableInstance<ElementData>>();
const currentFilter = ref<FilterType>("role");
const currentRow = ref<ElementData>();
const scriptList = ref<ScriptItem[]>([]);
const projectElements = ref<ElementData[]>([]);

const addDialogShow = ref(false);
const imageDialogShow = ref(false);
const batchShow = ref(false);
const batchPromptLoading = ref(false);
const batchImageLoading = ref(false);
const filterLoading = ref(false);

const radioOptions = [
  { label: "角色", value: "role" },
  { label: "场景", value: "scene" },
  { label: "道具", value: "props" },
  { label: "分镜", value: "storyboard" },
] as const;

const typeMap: Record<string, string> = {
  角色: "role",
  场景: "scene",
  分镜: "storyboard",
  道具: "props",
};

const typeToParam = (type: string) => ({ role: "角色", scene: "场景", props: "道具", storyboard: "分镜" })[type] ?? "角色";

const currentLabel = computed(() => radioOptions.find((i) => i.value === currentFilter.value)?.label);
const canAddElement = computed(() => !(scriptList.value.length === 0 && currentFilter.value === "storyboard"));

// 视觉风格：现实 / 漫剧 / 其他（用于资产生成与分镜图风格统一）
const visualStyleOptions = [
  { label: "未设置", value: "" },
  { label: "现实", value: "realistic" },
  { label: "漫剧", value: "anime" },
  { label: "其他", value: "other" },
];
const visualStyleValue = ref<string>("");
watch(
  project,
  (p) => {
    const v = (p as { visualStyle?: string } | null)?.visualStyle ?? "";
    visualStyleValue.value = ["realistic", "anime", "other"].includes(v) ? v : "";
  },
  { immediate: true }
);
async function onVisualStyleChange() {
  const v = visualStyleValue.value;
  try {
    await axios.post("/project/updateProject", {
      id: projectId.value,
      visualStyle: v === "" ? null : v,
    });
    await store().setProjectById(projectId.value);
    message.success("视觉风格已更新，后续生成将按此风格统一");
  } catch (e: any) {
    message.error(e?.message ?? "更新失败");
  }
}

function getTabIcon(value: string) {
  const icons: Record<string, string> = {
    role: "i-user",
    scene: "i-pic",
    props: "i-gift",
    storyboard: "i-film",
  };
  return icons[value] || "i-ad-product";
}

async function changeFilter(type: FilterType) {
  currentFilter.value = type;
  filterLoading.value = true;

  try {
    if (type === "storyboard") {
      scriptList.value = await fetchStoryboardList();
      if (scriptList.value.length) {
        currentScriptId.value = scriptList.value[0].id;
        await fetchStoryboardDetail(currentScriptId.value);
      } else {
        projectElements.value = [];
      }
    } else {
      await fetchAssets(type);
    }
  } finally {
    filterLoading.value = false;
  }
}

async function fetchAssets(type: string) {
  const res = await axios.post("/assets/getAssets", { projectId: projectId.value, type: typeToParam(type) });
  projectElements.value = res.data;
}

async function fetchStoryboardList() {
  const res = await axios.post("/assets/getStoryboard", { projectId: projectId.value });
  return res.data;
}

async function fetchStoryboardDetail(scriptId: number) {
  const res = await axios.post("/storyboard/getStoryboard", { projectId: projectId.value, scriptId });
  projectElements.value = res.data;
}

async function handleScriptChange(script: ScriptItem) {
  currentScriptId.value = script.id;
  await fetchStoryboardDetail(script.id);
}

function handleCheckedChange(data: { checked: boolean; row: ElementData }) {
  emits("checkChange", data);
}

function handleCheckedAll(data: { checked: boolean; records: ElementData[] }) {
  emits("checkAll", data, currentFilter.value, currentScriptId.value ?? -1);
}

function addElement() {
  currentRow.value = { id: 0, name: "", intro: "", duration: 0, filePath: "", type: "", prompt: "", remark: "", videoPrompt: "" };
  addDialogShow.value = true;
}

function editForm(row: ElementData) {
  currentRow.value = { ...row };
  addDialogShow.value = true;
}

function aiGenerate(row: ElementData) {
  currentRow.value = { ...row };
  imageDialogShow.value = true;
}

function deleteFrom(row: ElementData) {
  Modal.confirm({
    title: "确认删除",
    content: `确定要删除「${row.name || "该元素"}」吗？此操作不可恢复。`,
    okText: "删除",
    cancelText: "取消",
    okButtonProps: { danger: true },
    onOk: async () => {
      await axios.post("/assets/delAssets", { id: row.id });
      changeFilter(currentFilter.value);
      message.success("删除成功");
    },
  });
}

async function processBatch<T>(list: T[], handler: (item: T) => Promise<void>, batchSize = 5) {
  for (let i = 0; i < list.length; i += batchSize) {
    await Promise.all(list.slice(i, i + batchSize).map(handler));
  }
}

async function handleBatchSave(list: ElementData[]) {
  if (!list.length) return message.warning("请至少选择一个资产");

  await processBatch(list, async (item) => {
    await axios.post("/assets/updateAssets", {
      id: item.id,
      name: item.name,
      intro: item.intro ?? "",
      type: item.type,
      remark: item.remark ?? "",
      prompt: item.prompt,
      duration: Number(item.duration),
      videoPrompt: item.videoPrompt,
      dialogue: item.dialogue ?? "",
      narration: item.narration ?? "",
    });
    await axios.post("/assets/saveAssets", {
      id: item.id,
      base64: "",
      filePath: item.filePath,
      prompt: item.prompt,
      projectId: projectId.value,
    });
  });

  message.success("保存成功");
  changeFilter(currentFilter.value);
}

async function handleBatchGeneratePrompt() {
  if (!selectModal.value?.length) return message.warning("请至少选择一个资产");

  batchPromptLoading.value = true;
  await processBatch(selectModal.value, async (item) => {
    try {
      const res = await axios.post("/assets/polishPrompt", {
        projectId: projectId.value,
        assetsId: item.id,
        type: typeMap[item.type] ?? "props",
        name: item.name,
        describe: item.intro,
      });
      const idx = selectModal.value!.findIndex((i) => i.id === res.data.assetsId);
      if (idx !== -1) selectModal.value![idx].prompt = res.data.prompt;
    } catch (e: any) {
      message.error(e.message ?? "提示词生成失败");
    }
  });
  batchPromptLoading.value = false;
  message.success("提示词批量生成成功");
}

async function handleBatchGeneration() {
  if (!selectModal.value?.length) return message.warning("请至少选择一个资产");

  batchImageLoading.value = true;
  await processBatch(selectModal.value, async (item) => {
    try {
      const res = await axios.post("/assets/generateAssets", {
        type: typeMap[item.type] ?? "props",
        projectId: projectId.value,
        name: item.name,
        prompt: item.prompt,
        id: item.id,
      });
      const idx = selectModal.value!.findIndex((i) => i.id === res.data.assetsId);
      if (idx !== -1) selectModal.value![idx].filePath = res.data.path;
    } catch {}
  });
  batchImageLoading.value = false;
  message.success("图片批量生成成功");
}

function getSelectData() {
  return props.way === "radio" ? tableRef.value?.getRadioRecord(true) : tableRef.value?.getCheckboxRecords(true);
}

function changeChecked(data: { id: number }, checked: boolean) {
  tableRef.value?.setCheckboxRow(data, checked);
}

defineExpose({ getSelectData, changeChecked });

onMounted(() => {
  if (props.radio) currentFilter.value = props.radio;
  changeFilter(currentFilter.value);
});

watch(batchShow, (val) => {
  if (!val) changeFilter(currentFilter.value);
});
</script>

<style lang="scss" scoped>
:root {
  --mainColor: #9810fa;
  --mainColorLight: #faf5ff;
  --mainColorHover: #7c0dd4;
  --mainGradient: linear-gradient(135deg, #9810fa 0%, #7c3aed 100%);
}

.element-manager {
  margin-top: 20px;
  // 头部
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: linear-gradient(135deg, var(--mainColorLight) 0%, #f0f9ff 50%, #eff6ff 100%);
    border-radius: 16px;
    border: 1px solid rgba(152, 16, 250, 0.1);
    margin-bottom: 20px;

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--mainColor), #7c3aed);
        border-radius: 14px;
        color: #fff;
        box-shadow: 0 6px 20px rgba(152, 16, 250, 0.35);
      }

      .header-text {
        .title {
          margin: 0 0 4px;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .subtitle {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
        }
      }
    }

    .header-stats {
      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 24px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--mainColor);
        }

        .stat-label {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 2px;
        }
      }
    }
  }

  // 视觉风格栏
  .visual-style-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid #f3f4f6;
    margin-bottom: 16px;

    .visual-style-label {
      font-size: 14px;
      color: #374151;
      font-weight: 500;
    }

    :deep(.ant-radio-group) {
      .ant-radio-button-wrapper {
        border-radius: 8px;
      }
    }
  }

  // 工具栏
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: #fff;
    border-radius: 14px;
    border: 1px solid #f3f4f6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    margin-bottom: 20px;

    .tab-group {
      display: flex;
      gap: 8px;
      padding: 4px;
      background: #f9fafb;
      border-radius: 12px;

      .tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        background: transparent;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.25s ease;

        &:hover {
          color: var(--mainColor);
          background: rgba(152, 16, 250, 0.08);
        }

        &.active {
          background: linear-gradient(135deg, var(--mainColor), #7c3aed);
          color: #fff;
          box-shadow: 0 4px 12px rgba(152, 16, 250, 0.35);
        }
      }
    }

    .actions {
      display: flex;
      gap: 12px;

      .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s ease;

        &.primary {
          background: linear-gradient(135deg, var(--mainColor), #7c3aed);
          color: #fff;
          box-shadow: 0 4px 14px rgba(152, 16, 250, 0.35);

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(152, 16, 250, 0.45);
          }
        }

        &.secondary {
          background: var(--mainColorLight);
          color: var(--mainColor);
          border: 1px solid rgba(152, 16, 250, 0.2);

          &:hover:not(:disabled) {
            background: rgba(152, 16, 250, 0.15);
            border-color: rgba(152, 16, 250, 0.3);
          }
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
      }
    }
  }

  // 内容区
  .content-body {
    // 剧本选择器
    .script-selector {
      padding: 16px 20px;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #f3f4f6;
      margin-bottom: 20px;

      .script-label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }

      .script-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;

        .script-btn {
          padding: 8px 18px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--mainColor);
            color: var(--mainColor);
            background: var(--mainColorLight);
          }

          &.active {
            background: linear-gradient(135deg, var(--mainColor), #7c3aed);
            color: #fff;
            border-color: transparent;
            box-shadow: 0 3px 10px rgba(152, 16, 250, 0.3);
          }
        }
      }
    }

    // 空状态
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 40px;
      background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
      border-radius: 20px;
      border: 2px dashed #e5e7eb;

      .empty-icon {
        width: 100px;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--mainColorLight), #f3e8ff);
        border-radius: 50%;
        color: var(--mainColor);
        margin-bottom: 24px;
      }

      .empty-title {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }

      .empty-desc {
        margin: 0 0 24px;
        font-size: 14px;
        color: #9ca3af;
        text-align: center;
        max-width: 300px;
      }

      .empty-action {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 28px;
        background: linear-gradient(135deg, var(--mainColor), #7c3aed);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 4px 14px rgba(152, 16, 250, 0.35);

        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(152, 16, 250, 0.45);
        }
      }
    }

    // 表格
    .table-wrapper {
      background: #fff;
      border-radius: 16px;
      border: 1px solid #f3f4f6;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

      .name-cell {
        .name-text {
          font-weight: 600;
          color: #1f2937;
        }
      }

      .image-cell {
        display: flex;
        justify-content: center;

        .preview-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid #f3f4f6;
        }

        .no-image {
          width: 100px;
          height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          border-radius: 10px;
          color: #9ca3af;
          font-size: 12px;
        }
      }

      .desc-text,
      .prompt-text,
      .remark-text {
        margin: 0;
        font-size: 13px;
        color: #4b5563;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .prompt-textarea {
        border-radius: 8px;
        border-color: #e5e7eb;
        font-size: 13px;

        &:focus {
          border-color: var(--mainColor);
          box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.1);
        }
      }

      .duration-badge {
        display: inline-block;
        padding: 4px 12px;
        background: linear-gradient(135deg, var(--mainColorLight), #f3e8ff);
        color: var(--mainColor);
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
      }

      .action-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;

          &.edit {
            color: var(--mainColor);

            &:hover {
              background: var(--mainColorLight);
            }
          }

          &.magic {
            color: #f59e0b;

            &:hover {
              background: #fffbeb;
            }
          }

          &.delete {
            color: #ef4444;

            &:hover {
              background: #fef2f2;
            }
          }
        }
      }
    }
  }
}

// vxe-table 自定义样式
:deep(.vxe-table) {
  .vxe-header--column {
    background: #f9fafb !important;
    font-weight: 600;
    color: #374151;
  }

  .vxe-body--row {
    &:hover {
      background: var(--mainColorLight) !important;
    }

    &.row--stripe {
      background: #fafafa;
    }
  }

  .vxe-checkbox--icon,
  .vxe-radio--icon {
    color: var(--mainColor);
  }

  .vxe-cell--checkbox,
  .vxe-cell--radio {
    .vxe-checkbox--checked-icon,
    .vxe-radio--checked-icon {
      color: var(--mainColor);
    }
  }
}
</style>
