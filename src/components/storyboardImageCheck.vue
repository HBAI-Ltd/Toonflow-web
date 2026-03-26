<template>
  <t-dialog
    v-model:visible="dialogVisible"
    :header="$t('components.storyboardImageCheck.dialogTitle')"
    width="80vw"
    :footer="true"
    placement="center"
    @close="handleClose"
    @confirm="handleConfirm"
    @cancel="handleClose">
    <div class="assets">
      <div class="data">
        <div class="panelContent">
          <div class="toolbar">
            <div class="f ac">
              <t-input v-model="searchText" :placeholder="$t('workbench.assets.searchPlaceholder')" clearable style="width: 260px" />
              <t-button style="margin-left: 5px" @click="handleSearch">
                <template #icon>
                  <t-icon name="search" />
                </template>
                {{ $t("workbench.assets.search") }}
              </t-button>
            </div>
          </div>
          <div class="assetsList f w">
            <t-table
              :columns="clipColumns"
              :data="tableData"
              :selected-row-keys="selectedRowKeys"
              :expanded-row-keys="expandedRowKeys"
              row-key="id"
              hover
              stripe
              size="small"
              :pagination="pagination"
              :loading="loading"
              lazy-load
              table-layout="fixed"
              @select-change="handleSelectChange"
              @expand-change="handleExpandChange"
              @page-change="handlePageChange">
              <template #preview="{ row }">
                <div class="previewCell">
                  <t-image-viewer :images="[row.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                    <template #trigger="{ open }">
                      <div class="mediaTrigger" @click="row.src && open()">
                        <img :src="row.src" :alt="row.name" />
                        <div class="mediaHoverOverlay">
                          <t-icon name="browse" size="20px" />
                          <span class="hoverText">{{ $t("components.storyboardImageCheck.preview") }}</span>
                        </div>
                      </div>
                    </template>
                  </t-image-viewer>
                </div>
              </template>
              <template #startTime="{ row }">
                <span>{{ dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
              </template>
            </t-table>
          </div>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { useFileDialog } from "@vueuse/core";
import axios from "@/utils/axios";
import type { TabValue, TableProps } from "tdesign-vue-next";
import projectStore from "@/stores/project";
//表格数据类型定义
interface Storyboard {
  id: number;
  title: string;
  description: string;
  camera: string;
  duration: number;
  prompt: string;
  lines: string | null;
  sound: string | null;
  src: string | null;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
}
const props = withDefaults(
  defineProps<{
    /** 限制显示的资产类型 */
    allowedTypes?: ("role" | "tool" | "scene" | "clip")[];
    /** 是否多选 */
    multiple?: boolean;
    scriptId: number;
  }>(),
  {
    multiple: true,
  },
);

const emit = defineEmits<{
  /** 更新弹窗可见性 */
  (e: "update:visible", value: boolean): void;
  /** 点击确认，返回选中的行数据 */
  (e: "confirm", rows: Storyboard[]): void;
  /** 关闭弹窗 */
  (e: "cancel"): void;
}>();

// 弹窗双向绑定
const dialogVisible = defineModel({
  default: false,
});

// 监听弹窗打开，自动加载数据
watch(
  () => dialogVisible.value,
  (val) => {
    if (val) {
      pagination.value.page = 1;
      searchText.value = "";
      selectedRowKeys.value = [];
      getFilteredData();
    }
  },
);
onMounted(() => {
  getFilteredData();
});
const { project } = storeToRefs(projectStore());

const searchText = ref("");

const selectedRowKeys = ref<Array<string | number>>([]);
const expandedRowKeys = ref<Array<string | number>>([]);
const loading = ref(false);
// 正在生成提示词的资产 id 集合
const generatingIds = ref<Set<number>>(new Set());
// 正在生成图片的资产 id 集合
const generatingImageIds = ref<Set<number>>(new Set());
// 是否正在处于任意生成中（提示词或图片）
const isGenerating = (id: number) => generatingIds.value.has(id) || generatingImageIds.value.has(id);

const tableData = ref<Storyboard[]>([]);
// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});
function handleSearch() {
  pagination.value.page = 1;
  getFilteredData();
}
async function getFilteredData() {
  try {
    loading.value = true;
    const { data } = await axios.post("/production/storyboard/getStoryboardData", {
      scriptId: props.scriptId,
      name: searchText.value || undefined,
      page: pagination.value.page,
      limit: pagination.value.pageSize,
    }); 

    tableData.value = data.data || [];
    pagination.value.total = data.total || 0;
    return tableData.value;
  } catch (error) {
    console.error("加载资产数据失败:", error);
    tableData.value = [];
    pagination.value.total = 0;
  } finally {
    loading.value = false;
  }
}
// 新增
// 文件选择
const { open, onChange, onCancel } = useFileDialog({ multiple: false, reset: true, accept: ".png,.jpg,.jpeg,.mp3,.mp4" });
const selectType = props.multiple ? "multiple" : "single";

//剪辑表格列配置
const clipColumns: TableProps["columns"] = [
  {
    colKey: "row-select",
    type: selectType,
    width: 50,
    align: "center",
    fixed: "left",
    disabled: (row: any) => isGenerating(row.row?.id ?? row.id),
  },
  {
    colKey: "src",
    title: $t("components.storyboardImageCheck.src"),
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "title",
    title: $t("components.storyboardImageCheck.title"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "camera",
    title: $t("components.storyboardImageCheck.camera"), //镜头
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "duration",
    title: $t("components.storyboardImageCheck.duration"), //镜头
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "lines",
    title: $t("components.storyboardImageCheck.lines"), //台词
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "createTime",
    title: $t("components.storyboardImageCheck.createTime"),
    width: 200,
    align: "center",
    cell: "createTime",
  },
];

// 选择行（正在生成中的行不允许勾选）
function handleSelectChange(value: Array<string | number>) {
  const filtered = value.filter((key) => !isGenerating(key as number));
  if (!props.multiple) {
    selectedRowKeys.value = filtered.length > 0 ? [filtered[filtered.length - 1]] : [];
  } else {
    selectedRowKeys.value = filtered;
  }
}
function handleExpandChange(value: Array<string | number>) {
  if (value.length > 3) {
    value = value.slice(-3);
  }
  expandedRowKeys.value = value;
}

// 处理分页变化
function handlePageChange(pageInfo: { current: number; pageSize: number }) {
  pagination.value.page = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  getFilteredData();
}

// 确认选择
function handleConfirm() {
  const rows = tableData.value.filter((row) => selectedRowKeys.value.includes(row.id));
  emit("confirm", rows);
  emit("update:visible", false);
}

// 关闭弹窗
function handleClose() {
  emit("cancel");
  emit("update:visible", false);
}

defineExpose({
  selectedRowKeys,
  tableData,
});
</script>

<style lang="scss" scoped>
.assets {
  display: flex;
  flex-direction: column;
  .data {
    display: flex;
    flex-direction: column;
    .panelContent {
      display: flex;
      flex-direction: column;
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 16px;
      }
      .assetsList {
        overflow-y: auto;
        max-height: 55vh;
        .expandedContent {
          padding: 16px 24px;
          border-radius: 4px;
          margin: 8px 0;
        }
        .promptCell {
          display: flex;
          align-items: center;
          gap: 4px;
          .generating-text {
            font-style: italic;
          }
        }
        .generatingImage {
          flex-direction: column;
          gap: 6px;
          cursor: default;
          &:hover {
            transform: none !important;
          }
          .generatingLabel {
            font-size: 11px;
          }
        }
      }
      .previewCell {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 4px 0;
        .imageTrigger {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          &:hover {
            transform: scale(1.05);
            .imageHoverOverlay {
              opacity: 1;
            }
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .previewImage {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .noImage {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background-color: #dad8d8;
          }
          .imageHoverOverlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.3s ease;
            color: white;
            .hoverText {
              font-size: 12px;
            }
          }
        }
        .mediaTrigger {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 4px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          &:hover {
            transform: scale(1.05);
            .mediaHoverOverlay {
              opacity: 1;
            }
          }
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          &.videoThumb {
            background: #1a1a2e;
            .thumbVideo {
              width: 100%;
              height: 100%;
              object-fit: cover;
              pointer-events: none;
            }
          }
          &.audioThumb {
            color: white;
          }
          &.noMedia {
            cursor: default;
            &:hover {
              transform: none;
            }
          }
          .mediaHoverOverlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.3s ease;
            color: white;
            .hoverText {
              font-size: 12px;
            }
          }
        }
      }
    }
  }
}
</style>

<style lang="scss">
.generatePrompt,
.generateImage {
  cursor: pointer;
  padding: 8px 16px;
  &:hover {
    background-color: #f0f0f0;
  }
}

.mediaPreviewDialog {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 16px;
  .mediaPlayer {
    display: block;
    border-radius: 6px;
    outline: none;
  }
  .videoPlayer {
    width: 100%;
    max-height: 60vh;
    background: #000;
  }
  .audioWrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 16px 0;
    .audioIcon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .audioName {
      margin: 0;
      font-size: 14px;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .audioPlayer {
      width: 100%;
    }
  }
}
</style>
