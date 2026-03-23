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
                <t-popup placement="bottom">
                  <t-button theme="primary" v-if="assetOptions != 'clip'">
                    <template #icon>
                      <t-icon name="indent-left" />
                    </template>
                    批量生成
                  </t-button>
                  <template #content>
                    <div class="data">
                      <div class="generatePrompt">
                        <span @click="batchGeneration(1)">生成提示词</span>
                      </div>
                      <div class="generateImage">
                        <span @click="batchGeneration(2)">生成图片</span>
                      </div>
                    </div>
                  </template>
                </t-popup>
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
                height="calc(100vh - 300px)"
                stripe
                size="small"
                :pagination="pagination"
                :loading="loading"
                lazy-load
                table-layout="fixed"
                :select-on-row-click="false"
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
                <template #prompt="{ row }">
                  <div class="promptCell">
                    <t-loading v-if="generatingIds.has(row.id)" size="small" style="margin-right: 4px" />
                    <span :class="{ 'generating-text': generatingIds.has(row.id) }">{{ row.prompt }}</span>
                  </div>
                </template>
                <template #previewWithLoading="{ row }">
                  <div class="previewCell">
                    <div v-if="generatingImageIds.has(row.id)" class="imageTrigger generatingImage">
                      <t-loading size="small" />
                      <span class="generatingLabel">生成中</span>
                    </div>
                    <t-image-viewer v-else :images="[row.filePath]" :closeOnEscKeydown="true" :closeOnOverlay="true">
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
                    <t-button theme="primary" variant="text" :disabled="isGenerating(row.id)" @click="generate(row)">
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
                    <t-button theme="danger" variant="text" :disabled="isGenerating(row.id)" @click="handleDelete(row)">
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
                    <div v-else class="mediaTrigger noMedia">
                      <t-icon name="image" size="24px" />
                    </div>
                  </div>
                </template>
                <template #startTime="{ row }">
                  <span>{{ dayjs(row.startTime).format("YYYY-MM-DD HH:mm:ss") }}</span>
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
    <generateImage v-model="generateImageShow" @update="loadCurrentTabData" :formData="currentAssetData" />

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
    <t-dialog
      v-model:visible="batchGenerationShow"
      :header="batchType"
      width="600px"
      top="10vh"
      placement="center"
      destroyOnClose
      @confirm="keep"
      @close="batchGenerationShow = false">
      <div class="batch">
        <span>是否确认{{ batchType }}!</span>
        <t-form labelAlign="top">
          <t-form-item label="模型" name="selectValue" v-if="batchType === '批量生成图片'">
            <modelSelect v-model="selectValue" :type="`image`" />
          </t-form-item>
          <t-form-item label="分辨率" name="resolution" v-if="batchType === '批量生成图片'">
            <t-select v-model="resolution" placeholder="请选择分辨率">
              <t-option key="1k" label="1k" value="1k" />
              <t-option key="2k" label="2k" value="2k" />
              <t-option key="4k" label="4k" value="4k" />
            </t-select>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import modelSelect from "@/components/modelSelect.vue";
import { useFileDialog } from "@vueuse/core";
import axios from "@/utils/axios";
import type { TabValue, TableProps } from "tdesign-vue-next";
import addAssets from "./components/addAssets.vue";
import generateImage from "./components/generateImage.vue";
import projectStore from "@/stores/project";
import { f } from "vue-router/dist/router-CWoNjPRp.mjs";

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

onMounted(() => {
  loadCurrentTabData();
});
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
const selectedRowKeys = ref<Array<string | number>>([]);
const expandedRowKeys = ref<Array<string | number>>([]);
const loading = ref(false);
// 正在生成提示词的资产 id 集合
const generatingIds = ref<Set<number>>(new Set());
// 正在生成图片的资产 id 集合
const generatingImageIds = ref<Set<number>>(new Set());
// 是否正在处于任意生成中（提示词或图片）
const isGenerating = (id: number) => generatingIds.value.has(id) || generatingImageIds.value.has(id);
//表格数据类型定义
interface Asset {
  id: number;
  name: string;
  prompt: string;
  describe: string;
  remark: string;
  filePath?: string;
  type: "role" | "tool" | "scene" | "clip"; // "角色" | "道具" | "场景" | "素材"
  sonAssets?: Asset[]; // 子资产列表
  imageId: number;
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
      type: type,
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
const formData = ref<{ id: number; name: string; describe: string; remark: string; filePath?: string; prompt: string }>({
  id: 0,
  name: "",
  describe: "",
  remark: "",
  filePath: "",
  prompt: "",
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
      prompt: "",
    };
  }
}
const batchGenerationShow = ref(false);
const selectValue = ref(""); //选择的模型
const resolution = ref("1k"); //选择的分辨率
const batchType = ref("");
function batchGeneration(type: number) {
  batchType.value = type === 1 ? "批量生成提示词" : "批量生成图片";
  batchGenerationShow.value = true;
}
function keep() {
  if (batchType.value === "批量生成提示词") {
    handleBatchGeneratePrompt();
  } else if (batchType.value === "批量生成图片") {
    handleBatchGenerateImage();
  }
}
// 批量生成提示词
async function handleBatchGeneratePrompt() {
  const selectedAssets = tableData.value.filter((item: any) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    MessagePlugin.warning("请至少选择一个资产");
    return;
  }
  const newSet = new Set(generatingIds.value);
  selectedAssets.forEach((asset) => newSet.add(asset.id));
  generatingIds.value = newSet;
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => !selectedAssets.some((a) => a.id === key));
  batchGenerationShow.value = false;

  for (const asset of selectedAssets) {
    try {
      await axios.post("/assetsGenerate/polishAssetsPrompt", {
        projectId: project.value?.id,
        assetsId: asset.id,
        type: asset.type ?? "props",
        name: asset.name,
        describe: asset.describe ? asset.describe : "无描述",
      });
      await getFilteredData(assetOptions.value);
      MessagePlugin.success(`「${asset.name}」提示词生成成功`);
    } catch (e: any) {
      MessagePlugin.error(`「${asset.name}」提示词生成失败：${e.message ?? ""}`);
    } finally {
      const s = new Set(generatingIds.value);
      s.delete(asset.id);
      generatingIds.value = s;
    }
  }
}
// 批量生成图片
async function handleBatchGenerateImage() {
  const selectedAssets = tableData.value.filter((item: any) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    MessagePlugin.warning("请至少选择一个资产");
    return;
  }
  if (!selectValue.value) {
    MessagePlugin.error("请选择模型");
    return;
  }
  if (!resolution.value) {
    MessagePlugin.error("请选择分辨率");
    return;
  }

  const newSet = new Set(generatingImageIds.value);
  selectedAssets.forEach((asset) => newSet.add(asset.id));
  generatingImageIds.value = newSet;
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => !selectedAssets.some((a) => a.id === key));
  batchGenerationShow.value = false;

  for (const asset of selectedAssets) {
    if (!asset.prompt) {
      MessagePlugin.warning(`「${asset.name}」没有提示词，无法生成图片`);
      const s = new Set(generatingImageIds.value);
      s.delete(asset.id);
      generatingImageIds.value = s;
      continue;
    }
    try {
      await axios.post("/assetsGenerate/generateAssets", {
        type: asset.type ?? "props",
        projectId: project.value?.id,
        name: asset.name,
        base64: "",
        prompt: asset.prompt,
        model: selectValue.value,
        id: asset.id,
        resolution: resolution.value,
      });
      await getFilteredData(assetOptions.value);
      MessagePlugin.success(`「${asset.name}」图片生成成功`);
    } catch (e: any) {
      MessagePlugin.error(`「${asset.name}」图片生成失败：${e.message ?? ""}`);
    } finally {
      const s = new Set(generatingImageIds.value);
      s.delete(asset.id);
      generatingImageIds.value = s;
    }
  }
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
  {
    colKey: "row-select",
    type: selectType,
    width: 50,
    align: "center",
    fixed: "left",
    disabled: (row: any) => isGenerating(row.row?.id ?? row.id),
  },
  {
    colKey: "filePath",
    title: "预览",
    width: 100,
    align: "center",
    cell: "previewWithLoading",
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
    cell: "prompt",
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
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  .data {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    :deep(.t-tabs) {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      .t-tabs__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .t-tab-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
    }
    .tabLabel {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panelContent {
      margin-top: 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 16px;
      }
      .data {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .assetsList {
        flex: 1;
        overflow-y: auto;
        min-height: 0;
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
