<template>
  <div class="assets">
    <div class="data">
      <t-tabs v-model="assetOptions" @change="selectAssetOptions">
        <t-tab-panel v-for="(item, index) in themeData" :key="index" :value="item.value">
          <template #label>
            <div class="tabLabel">
              <component :is="item.icon" theme="outline" size="20" />
              <span>{{ item.name }}</span>
            </div>
          </template>

          <div class="panelContent">
            <div class="toolbar">
              <t-space>
                <t-button theme="primary" @click="handleAdd(item.value)">
                  <template #icon>
                    <t-icon name="add" />
                  </template>
                  新增{{ item.name }}
                </t-button>
                <t-button theme="primary" @click="handleBatchGenerate" v-if="assetOptions != 'clip'">
                  <template #icon>
                    <t-icon name="indent-left" />
                  </template>
                  批量生成
                </t-button>
                <t-button theme="default" variant="outline" @click="handleBatchDelete">
                  <template #icon>
                    <t-icon name="delete" />
                  </template>
                  批量删除
                </t-button>
              </t-space>
              <div class="f ac">
                <t-input v-model="searchText" placeholder="搜索资产名称..." clearable style="width: 260px" />
                <t-button style="margin-left: 5px" @click="handleSearch">
                  <template #icon>
                    <t-icon name="search" />
                  </template>
                  搜索
                </t-button>
              </div>
            </div>
            <div class="assetsList f w">
              <t-table
                v-if="assetOptions !== 'clip'"
                :columns="columns"
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
                <template #expandedRow="{ row }">
                  <div class="expandedContent">
                    <t-table :columns="subColumns" :data="row.sonAssets || []" row-key="id" hover size="small" table-layout="fixed">
                      <template #preview="{ row: subRow }">
                        <div class="previewCell">
                          <t-image-viewer :images="[subRow.filePath]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                            <template #trigger="{ open }">
                              <div class="imageTrigger" @click="subRow.filePath && open()">
                                <img v-if="subRow.filePath" :src="subRow.filePath" :alt="subRow.name" />
                                <div v-else class="noImage">
                                  <t-icon name="image" size="24px" />
                                </div>
                                <div v-if="subRow.filePath" class="imageHoverOverlay">
                                  <t-icon name="browse" size="20px" />
                                  <span class="hoverText">预览</span>
                                </div>
                              </div>
                            </template>
                          </t-image-viewer>
                        </div>
                      </template>
                      <template #operation="{ row: subRow }">
                        <t-space :size="0">
                          <t-button theme="primary" variant="text" @click="generate(subRow)">
                            <template #icon>
                              <i-magic :size="18" />
                            </template>
                            生成
                          </t-button>
                          <t-button theme="primary" variant="text" @click="handleEdit(subRow)">
                            <template #icon>
                              <t-icon name="edit" />
                            </template>
                            编辑
                          </t-button>
                          <t-button theme="danger" variant="text" @click="handleDelete(subRow)">
                            <template #icon>
                              <t-icon name="delete" />
                            </template>
                            删除
                          </t-button>
                        </t-space>
                      </template>
                    </t-table>
                  </div>
                </template>
                <template #preview="{ row }">
                  <div class="previewCell">
                    <t-image-viewer :images="[row.filePath]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="imageTrigger" @click="row.filePath && open()">
                          <img v-if="row.filePath" :src="row.filePath" :alt="row.name" class="previewImage" />
                          <div v-else class="noImage">
                            <t-icon name="image" size="24px" />
                          </div>
                          <div v-if="row.filePath" class="imageHoverOverlay">
                            <t-icon name="browse" size="20px" />
                            <span class="hoverText">预览</span>
                          </div>
                        </div>
                      </template>
                    </t-image-viewer>
                  </div>
                </template>
                <template #startTime="{ row }">
                  <span>{{ dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
                </template>
                <template #operation="{ row }">
                  <t-space :size="0">
                    <t-button theme="primary" variant="text" @click="generate(row)">
                      <template #icon>
                        <i-magic :size="18" />
                      </template>
                      生成
                    </t-button>
                    <t-button theme="primary" variant="text" @click="handleEdit(row)">
                      <template #icon>
                        <t-icon name="edit" />
                      </template>
                      编辑
                    </t-button>
                    <t-button theme="danger" variant="text" @click="handleDelete(row)">
                      <template #icon>
                        <t-icon name="delete" />
                      </template>
                      删除
                    </t-button>
                  </t-space>
                </template>
              </t-table>
              <t-table
                v-if="assetOptions == 'clip'"
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
                    <!-- 图片预览 -->
                    <t-image-viewer
                      v-if="getMediaType(row.filePath) === 'image'"
                      :images="[row.filePath]"
                      :closeOnEscKeydown="true"
                      :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="mediaTrigger" @click="row.filePath && open()">
                          <img :src="row.filePath" :alt="row.name" />
                          <div class="mediaHoverOverlay">
                            <t-icon name="browse" size="20px" />
                            <span class="hoverText">预览</span>
                          </div>
                        </div>
                      </template>
                    </t-image-viewer>
                    <!-- 视频预览 -->
                    <div
                      v-else-if="getMediaType(row.filePath) === 'video'"
                      class="mediaTrigger videoThumb"
                      @click="openMediaPreview(row.filePath, row.name)">
                      <video :src="row.filePath" class="thumbVideo" />
                      <div class="mediaHoverOverlay">
                        <t-icon name="play-circle" size="24px" />
                        <span class="hoverText">播放</span>
                      </div>
                    </div>
                    <!-- 音频预览 -->
                    <div
                      v-else-if="getMediaType(row.filePath) === 'audio'"
                      class="mediaTrigger audioThumb"
                      @click="openMediaPreview(row.filePath, row.name)">
                      <t-icon name="music" size="28px" />
                      <div class="mediaHoverOverlay">
                        <t-icon name="play-circle" size="24px" />
                        <span class="hoverText">播放</span>
                      </div>
                    </div>
                    <!-- 无文件 -->
                    <div v-else class="mediaTrigger noMedia">
                      <t-icon name="image" size="24px" />
                    </div>
                  </div>
                </template>
                <template #operation="{ row }">
                  <t-space :size="0">
                    <t-button theme="primary" variant="text" @click="handleEdit(row)">
                      <template #icon>
                        <t-icon name="edit" />
                      </template>
                      编辑
                    </t-button>
                    <t-button theme="danger" variant="text" @click="handleDelete(row)">
                      <template #icon>
                        <t-icon name="delete" />
                      </template>
                      删除
                    </t-button>
                  </t-space>
                </template>
              </t-table>
            </div>
          </div>
        </t-tab-panel>
      </t-tabs>
    </div>
    <addAssets
      v-model="addAssetsShow"
      :type="assetOptions"
      :title="tabNameMap[assetOptions]"
      :formData="formData"
      @getFilteredData="getFilteredData(assetOptions)" />
    <batchGeneration v-model="batchGenerationShow" :type="assetOptions" @update="loadCurrentTabData" />
    <generateImage v-model="generateImageShow" @update="loadCurrentTabData" :formData="currentAssetData" />

    <!-- 媒体预览弹窗（视频 / 音频） -->
    <t-dialog
      v-model:visible="mediaPreviewShow"
      :header="mediaPreviewName || '媒体预览'"
      :footer="false"
      width="600px"
      placement="center"
      destroyOnClose
      @close="closeMediaPreview">
      <div class="mediaPreviewDialog">
        <video v-if="mediaPreviewType === 'video'" :src="mediaPreviewSrc" controls autoplay class="mediaPlayer videoPlayer" />
        <div v-else-if="mediaPreviewType === 'audio'" class="audioWrapper">
          <div class="audioIcon">
            <t-icon name="music" size="64px" />
          </div>
          <p class="audioName">{{ mediaPreviewName }}</p>
          <audio :src="mediaPreviewSrc" controls autoplay class="mediaPlayer audioPlayer" />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { useFileDialog } from "@vueuse/core";
import axios from "@/utils/axios";
import type { TabValue, TableProps } from "tdesign-vue-next";
import addAssets from "./components/addAssets.vue";
import batchGeneration from "./components/batchGeneration.vue";
import generateImage from "./components/generateImage.vue";
import projectStore from "@/stores/project";

const props = withDefaults(
  defineProps<{
    /** 是否作为选择器弹窗使用 */
    selectorMode?: boolean;
    /** 限制显示的资产类型 */
    allowedTypes?: ("role" | "tool" | "scene" | "clip")[];
    /** 是否多选 */
    multiple?: boolean;
  }>(),
  {
    selectorMode: false,
    multiple: true,
  },
);

const { project } = storeToRefs(projectStore());

const allThemeData = [
  {
    name: "角色",
    value: "role",
    icon: "i-permissions",
  },
  {
    name: "道具",
    value: "tool",
    icon: "i-tool",
  },
  {
    name: "场景",
    value: "scene",
    icon: "i-landscape",
  },
  {
    name: "素材",
    value: "clip",
    icon: "i-editing",
  },
];
const themeData = ref(props.allowedTypes?.length ? allThemeData.filter((item) => props.allowedTypes!.includes(item.value as any)) : allThemeData);

const initialTab = (themeData.value[0]?.value || "role") as "role" | "tool" | "scene" | "clip";
const assetOptions = ref<"role" | "tool" | "scene" | "clip">(initialTab);
const searchText = ref("");

const tabNameMap: Record<string, string> = { role: "角色", tool: "道具", scene: "场景", clip: "素材" };
const activeTab = ref(tabNameMap[initialTab] || "角色");
const selectedRowKeys = ref<Array<string | number>>([]);
const expandedRowKeys = ref<Array<string | number>>([]);
const loading = ref(false);
//表格数据类型定义
interface Asset {
  id: number;
  name: string;
  prompt: string;
  describe: string;
  remark: string;
  filePath?: string;
  type: string; // "角色" | "道具" | "场景"
  sonAssets?: Asset[]; // 子资产列表
}
const tableData = ref<Asset[]>([]);
// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  showJumper: true,
});
function handleSearch() {
  pagination.value.page = 1;
  getFilteredData(assetOptions.value);
}
async function getFilteredData(type: string) {
  try {
    loading.value = true;
    const { data } = await axios.post("/assets/getAssetsApi", {
      projectId: project.value?.id,
      type,
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
// 加载当前标签的数据
async function loadCurrentTabData() {
  let type = "";
  if (assetOptions.value === "role") {
    type = "角色";
  } else if (assetOptions.value === "tool") {
    type = "道具";
  } else if (assetOptions.value === "scene") {
    type = "场景";
  } else if (assetOptions.value === "clip") {
    type = "素材";
  }
  await getFilteredData(assetOptions.value);
}
function selectAssetOptions(value: TabValue) {
  searchText.value = "";
  selectedRowKeys.value = [];
  expandedRowKeys.value = [];
  pagination.value.page = 1;
  loadCurrentTabData();
}
const formData = ref<{ id: number; name: string; describe: string; remark: string; filePath?: string }>({
  id: 0,
  name: "",
  describe: "",
  remark: "",
  filePath: "",
});
const addAssetsShow = ref(false);
// 新增
// 文件选择
const { open, onChange, onCancel } = useFileDialog({ multiple: false, reset: true, accept: ".png,.jpg,.jpeg,.mp3,.mp4" });
async function handleAdd(type: string) {
  if (type === "clip") {
    const files = await new Promise<FileList | null>((resolve) => {
      open();
      onChange((f) => resolve(f));
      onCancel(() => resolve(null));
    });
    if (!files?.length) return;

    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = reader.result as string;

      await axios.post("/assets/uploadClip", {
        projectId: project.value?.id,
        base64Data: base64,
        name: file.name,
      });
      MessagePlugin.success("上传成功");
      getFilteredData(assetOptions.value);
    };
    reader.readAsDataURL(file);
  } else {
    addAssetsShow.value = true;
    formData.value = {
      id: 0,
      name: "",
      describe: "",
      remark: "",
    };
  }
}
const batchGenerationShow = ref(false);
// 批量生成
function handleBatchGenerate() {
  batchGenerationShow.value = true;
}
// 批量删除
function handleBatchDelete() {
  const selectedAssets = tableData.value.filter((item: any) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    MessagePlugin.warning("请至少选择一个资产");
    return;
  }
  const dialog = DialogPlugin.confirm({
    header: "确认删除",
    body: "确定要批量删除这些资产吗？此操作无法撤销。",
    confirmBtn: "删除",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      await axios.post("/assets/batchDelete", { id: selectedAssets.map((asset) => asset.id) });
      MessagePlugin.success("资产删除成功");
      getFilteredData(assetOptions.value);
      dialog.destroy();
    },
  });
}
// 父资产表格列配置
const selectType = props.multiple ? "multiple" : "single";
const columns: TableProps["columns"] = [
  { colKey: "row-select", type: selectType, width: 50, align: "center", fixed: "left" },
  {
    colKey: "filePath",
    title: "预览",
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: "名称",
    width: 100,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "prompt",
    title: "提示词",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "describe",
    title: "描述",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: "备注",
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "startTime",
    title: "创建时间",
    width: 200,
    align: "center",
    cell: "startTime",
  },
  {
    colKey: "operation",
    title: "操作",
    width: 280,
    align: "center",
    fixed: "right",
    cell: "operation",
  },
];

// 子资产表格列配置 - 不含勾选框和创建时间
const subColumns: TableProps["columns"] = [
  {
    colKey: "filePath",
    title: "预览",
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: "名称",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "prompt",
    title: "提示词",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "describe",
    title: "描述",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: "备注",
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "operation",
    title: "操作",
    width: 180,
    align: "center",
    fixed: "right",
    cell: "operation",
  },
];

//剪辑表格列配置
const clipColumns: TableProps["columns"] = [
  { colKey: "row-select", type: "multiple", width: 50, align: "center", fixed: "left" },
  {
    colKey: "filePath",
    title: "预览",
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: "名称",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "describe",
    title: "描述",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: "备注",
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "startTime",
    title: "创建时间",
    width: 200,
    align: "center",
    cell: "startTime",
  },
  {
    colKey: "operation",
    title: "操作",
    width: 180,
    align: "center",
    fixed: "right",
    cell: "operation",
  },
];

// 选择行
function handleSelectChange(value: Array<string | number>) {
  if (!props.multiple) {
    selectedRowKeys.value = value.length > 0 ? [value[value.length - 1]] : [];
  } else {
    selectedRowKeys.value = value;
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
  loadCurrentTabData();
}
// 生成
const generateImageShow = ref(false);
// 当前操作的资产数据（用于图片生成）
const currentAssetData = ref<{
  id?: number;
  name?: string;
  describe?: string;
  type?: string;
  prompt?: string;
  filePath: string;
}>({
  id: undefined,
  name: "",
  describe: "",
  type: "",
  prompt: "",
  filePath: "",
});
function generate(row: any) {
  currentAssetData.value = {
    id: row.id,
    name: row.name,
    describe: row.describe,
    type: row.type,
    prompt: row.prompt,
    filePath: row.filePath,
  };
  generateImageShow.value = true;
}
// 编辑
function handleEdit(row: any) {
  formData.value = {
    ...row,
  };
  addAssetsShow.value = true;
}
// 删除
function handleDelete(row: any) {
  const dialog = DialogPlugin.confirm({
    header: "确认删除",
    body: "确定要删除这资产吗？此操作无法撤销。",
    confirmBtn: "删除",
    cancelBtn: "取消",
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/assets/delAssets", { id: row.id });
        MessagePlugin.success("资产删除成功");
        getFilteredData(assetOptions.value);
        dialog.destroy();
      } catch (error) {
        console.error("删除资产失败:", error);
        MessagePlugin.error("资产删除失败");
        dialog.destroy();
      }
    },
  });
}

defineExpose({
  selectedRowKeys,
  tableData,
});

// ===== 媒体预览 =====
type MediaType = "image" | "video" | "audio" | "unknown";

function getMediaType(filePath?: string): MediaType {
  if (!filePath) return "unknown";
  const ext = filePath.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "unknown";
}

const mediaPreviewShow = ref(false);
const mediaPreviewSrc = ref("");
const mediaPreviewType = ref<MediaType>("unknown");
const mediaPreviewName = ref("");

function openMediaPreview(filePath: string, name: string) {
  if (!filePath) return;
  mediaPreviewSrc.value = filePath;
  mediaPreviewType.value = getMediaType(filePath);
  mediaPreviewName.value = name;
  mediaPreviewShow.value = true;
}
function closeMediaPreview() {
  mediaPreviewShow.value = false;
  mediaPreviewSrc.value = "";
}
</script>

<style lang="scss" scoped>
.assets {
  .data {
    .tabLabel {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panelContent {
      margin-top: 20px;
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 16px;
      }
      .assetsList {
        .expandedContent {
          padding: 16px 24px;
          border-radius: 4px;
          margin: 8px 0;
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
            background: var(--td-bg-color-component, #f5f5f5);
            color: var(--td-text-color-placeholder, #c0c0c0);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          &.noMedia {
            background: var(--td-bg-color-component, #f5f5f5);
            color: var(--td-text-color-placeholder, #c0c0c0);
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
// 媒体预览弹窗内容（t-dialog 内容挂载在 body 下，需要全局样式）
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
      color: var(--td-text-color-secondary, #666);
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
