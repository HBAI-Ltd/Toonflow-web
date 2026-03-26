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
                  {{ $t("workbench.assets.addPrefix") }}{{ item.name }}
                </t-button>
                <t-popup placement="bottom">
                  <t-button theme="primary" v-if="assetOptions != 'clip'">
                    <template #icon>
                      <t-icon name="indent-left" />
                    </template>
                    {{ $t("workbench.assets.batchGenerate") }}
                  </t-button>
                  <template #content>
                    <div class="data">
                      <div class="generatePrompt">
                        <span @click="batchGeneration(1)">{{ $t("workbench.assets.generatePrompt") }}</span>
                      </div>
                      <div class="generateImage">
                        <span @click="batchGeneration(2)">{{ $t("workbench.assets.generateImage") }}</span>
                      </div>
                    </div>
                  </template>
                </t-popup>
                <t-button theme="default" variant="outline" @click="handleBatchDelete">
                  <template #icon>
                    <t-icon name="delete" />
                  </template>
                  {{ $t("workbench.assets.batchDelete") }}
                </t-button>
              </t-space>
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
                          <t-image-viewer :images="[subRow.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                            <template #trigger="{ open }">
                              <div class="imageTrigger" @click="subRow.src && open()">
                                <img v-if="subRow.src" :src="subRow.src" :alt="subRow.name" />
                                <div v-else class="noImage">
                                  <t-icon name="image" size="24px" />
                                </div>
                                <div v-if="subRow.src" class="imageHoverOverlay">
                                  <t-icon name="browse" size="20px" />
                                  <span class="hoverText">{{ $t("workbench.assets.preview") }}</span>
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
                            {{ $t("workbench.assets.generate") }}
                          </t-button>
                          <t-button theme="primary" variant="text" @click="handleEdit(subRow)">
                            <template #icon>
                              <t-icon name="edit" />
                            </template>
                            {{ $t("workbench.assets.edit") }}
                          </t-button>
                          <t-button theme="danger" variant="text" @click="handleDelete(subRow)">
                            <template #icon>
                              <t-icon name="delete" />
                            </template>
                            {{ $t("workbench.assets.delete") }}
                          </t-button>
                        </t-space>
                      </template>
                    </t-table>
                  </div>
                </template>
                <template #preview="{ row }">
                  <div class="previewCell">
                    <t-image-viewer :images="[row.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="imageTrigger" @click="row.src && open()">
                          <img v-if="row.src" :src="row.src" :alt="row.name" class="previewImage" />
                          <div v-else class="noImage">
                            <t-icon name="image" size="24px" />
                          </div>
                          <div v-if="row.src" class="imageHoverOverlay">
                            <t-icon name="browse" size="20px" />
                            <span class="hoverText">{{ $t("workbench.assets.preview") }}</span>
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
                      <span class="generatingLabel">{{ $t("workbench.assets.generating") }}</span>
                    </div>
                    <t-image-viewer v-else :images="[row.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="imageTrigger" @click="row.src && open()">
                          <img v-if="row.src" :src="row.src" :alt="row.name" class="previewImage" />
                          <div v-else class="noImage">
                            <t-icon name="image" size="24px" />
                          </div>
                          <div v-if="row.src" class="imageHoverOverlay">
                            <t-icon name="browse" size="20px" />
                            <span class="hoverText">{{ $t("workbench.assets.preview") }}</span>
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
                      {{ $t("workbench.assets.generate") }}
                    </t-button>
                    <t-button theme="primary" variant="text" @click="handleEdit(row)">
                      <template #icon>
                        <t-icon name="edit" />
                      </template>
                      {{ $t("workbench.assets.edit") }}
                    </t-button>
                    <t-button theme="danger" variant="text" :disabled="isGenerating(row.id)" @click="handleDelete(row)">
                      <template #icon>
                        <t-icon name="delete" />
                      </template>
                      {{ $t("workbench.assets.delete") }}
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
                    <t-image-viewer v-if="getMediaType(row.src) === 'image'" :images="[row.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="mediaTrigger" @click="row.src && open()">
                          <img :src="row.src" :alt="row.name" />
                          <div class="mediaHoverOverlay">
                            <t-icon name="browse" size="20px" />
                            <span class="hoverText">{{ $t("workbench.assets.preview") }}</span>
                          </div>
                        </div>
                      </template>
                    </t-image-viewer>
                    <div v-else-if="getMediaType(row.src) === 'video'" class="mediaTrigger videoThumb" @click="openMediaPreview(row.src, row.name)">
                      <video :src="row.src" class="thumbVideo" />
                      <div class="mediaHoverOverlay">
                        <t-icon name="play-circle" size="24px" />
                        <span class="hoverText">{{ $t("workbench.assets.play") }}</span>
                      </div>
                    </div>
                    <div v-else-if="getMediaType(row.src) === 'audio'" class="mediaTrigger audioThumb" @click="openMediaPreview(row.src, row.name)">
                      <t-icon name="music" size="28px" />
                      <div class="mediaHoverOverlay">
                        <t-icon name="play-circle" size="24px" />
                        <span class="hoverText">{{ $t("workbench.assets.play") }}</span>
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
                      {{ $t("workbench.assets.edit") }}
                    </t-button>
                    <t-button theme="danger" variant="text" @click="handleDelete(row)">
                      <template #icon>
                        <t-icon name="delete" />
                      </template>
                      {{ $t("workbench.assets.delete") }}
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
      :header="mediaPreviewName || $t('workbench.assets.mediaPreview')"
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
        <span>{{ $t("workbench.assets.confirmBatch", { type: batchType }) }}</span>
        <t-form labelAlign="top">
          <t-form-item :label="$t('workbench.assets.model')" name="selectValue" v-if="batchType === $t('workbench.assets.batchGenImage')">
            <modelSelect v-model="selectValue" :type="`image`" />
          </t-form-item>
          <t-form-item :label="$t('workbench.assets.resolution')" name="resolution" v-if="batchType === $t('workbench.assets.batchGenImage')">
            <t-select v-model="resolution" :placeholder="$t('workbench.assets.resolutionPh')">
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
    name: $t("workbench.assets.role"),
    value: "role",
    icon: "i-permissions",
  },
  {
    name: $t("workbench.assets.prop"),
    value: "tool",
    icon: "i-tool",
  },
  {
    name: $t("workbench.assets.scene"),
    value: "scene",
    icon: "i-landscape",
  },
  {
    name: $t("workbench.assets.clip"),
    value: "clip",
    icon: "i-editing",
  },
];
const themeData = ref(props.allowedTypes?.length ? allThemeData.filter((item) => props.allowedTypes!.includes(item.value as any)) : allThemeData);

const initialTab = (themeData.value[0]?.value || "role") as "role" | "tool" | "scene" | "clip";
const assetOptions = ref<"role" | "tool" | "scene" | "clip">(initialTab);
const searchText = ref("");

const tabNameMap: Record<string, string> = {
  role: $t("workbench.assets.role"),
  tool: $t("workbench.assets.prop"),
  scene: $t("workbench.assets.scene"),
  clip: $t("workbench.assets.clip"),
};
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
  assetsId: number | null;
  name: string;
  prompt: string;
  describe: string;
  remark: string;
  src: string;
  type: "role" | "tool" | "scene" | "clip"; // "角色" | "道具" | "场景" | "素材"
  state: "未生成" | "生成中" | "已完成" | "生成失败";
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
const formData = ref<{ id: number; name: string; describe: string; remark: string; src?: string; prompt: string }>({
  id: 0,
  name: "",
  describe: "",
  remark: "",
  src: "",
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
      window.$message.success($t("workbench.assets.uploadSuccess"));
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
  batchType.value = type === 1 ? $t("workbench.assets.batchGenPrompt") : $t("workbench.assets.batchGenImage");
  batchGenerationShow.value = true;
}
function keep() {
  if (batchType.value === $t("workbench.assets.batchGenPrompt")) {
    handleBatchGeneratePrompt();
  } else if (batchType.value === $t("workbench.assets.batchGenImage")) {
    handleBatchGenerateImage();
  }
}
// 批量生成提示词
async function handleBatchGeneratePrompt() {
  const selectedAssets = tableData.value.filter((item: any) => selectedRowKeys.value.includes(item.id));
  if (selectedAssets.length === 0) {
    window.$message.warning($t("workbench.assets.selectAtLeastOne"));
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
        describe: asset.describe ? asset.describe : $t("workbench.assets.noDescription"),
      });
      await getFilteredData(assetOptions.value);
      window.$message.success($t("workbench.assets.promptGenSuccess", { name: asset.name }));
    } catch (e: any) {
      window.$message.error($t("workbench.assets.promptGenFail", { name: asset.name, error: e.message ?? "" }));
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
    window.$message.warning($t("workbench.assets.selectAtLeastOne"));
    return;
  }
  if (!selectValue.value) {
    window.$message.error($t("workbench.assets.selectModel"));
    return;
  }
  if (!resolution.value) {
    window.$message.error($t("workbench.assets.selectResolution"));
    return;
  }

  const newSet = new Set(generatingImageIds.value);
  selectedAssets.forEach((asset) => newSet.add(asset.id));
  generatingImageIds.value = newSet;
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => !selectedAssets.some((a) => a.id === key));
  batchGenerationShow.value = false;

  for (const asset of selectedAssets) {
    if (!asset.prompt) {
      window.$message.warning($t("workbench.assets.noPromptForImage", { name: asset.name }));
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
      window.$message.success($t("workbench.assets.imageGenSuccess", { name: asset.name }));
    } catch (e: any) {
      window.$message.error($t("workbench.assets.imageGenFail", { name: asset.name, error: e.message ?? "" }));
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
    window.$message.warning($t("workbench.assets.selectAtLeastOne"));
    return;
  }
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.assets.confirmBatchDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      await axios.post("/assets/batchDelete", { id: selectedAssets.map((asset) => asset.id) });
      window.$message.success($t("workbench.assets.deleteSuccess"));
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
    colKey: "src",
    title: $t("workbench.assets.colPreview"),
    width: 100,
    align: "center",
    cell: "previewWithLoading",
  },
  {
    colKey: "name",
    title: $t("workbench.assets.colName"),
    width: 100,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "prompt",
    title: $t("workbench.assets.colPrompt"),
    width: 200,
    align: "left",
    ellipsis: true,
    cell: "prompt",
  },
  {
    colKey: "describe",
    title: $t("workbench.assets.colDescribe"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: $t("workbench.assets.colRemark"),
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "startTime",
    title: $t("workbench.assets.colCreateTime"),
    width: 200,
    align: "center",
    cell: "startTime",
  },
  {
    colKey: "operation",
    title: $t("workbench.assets.colOperation"),
    width: 280,
    align: "center",
    fixed: "right",
    cell: "operation",
  },
];

// 子资产表格列配置 - 不含勾选框和创建时间
const subColumns: TableProps["columns"] = [
  {
    colKey: "src",
    title: $t("workbench.assets.colPreview"),
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: $t("workbench.assets.colName"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "prompt",
    title: $t("workbench.assets.colPrompt"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "describe",
    title: $t("workbench.assets.colDescribe"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: $t("workbench.assets.colRemark"),
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "operation",
    title: $t("workbench.assets.colOperation"),
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
    colKey: "src",
    title: $t("workbench.assets.colPreview"),
    width: 100,
    align: "center",
    cell: "preview",
  },
  {
    colKey: "name",
    title: $t("workbench.assets.colName"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "describe",
    title: $t("workbench.assets.colDescribe"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: $t("workbench.assets.colRemark"),
    minWidth: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "startTime",
    title: $t("workbench.assets.colCreateTime"),
    width: 200,
    align: "center",
    cell: "startTime",
  },
  {
    colKey: "operation",
    title: $t("workbench.assets.colOperation"),
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
  src: string;
}>({
  id: undefined,
  name: "",
  describe: "",
  type: "",
  prompt: "",
  src: "",
});
function generate(row: any) {
  currentAssetData.value = {
    id: row.id,
    name: row.name,
    describe: row.describe,
    type: row.type,
    prompt: row.prompt,
    src: row.src,
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
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.assets.confirmDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        await axios.post("/assets/delAssets", { id: row.id });
        window.$message.success($t("workbench.assets.deleteSuccess"));
        getFilteredData(assetOptions.value);
        dialog.destroy();
      } catch (error) {
        console.error("删除资产失败:", error);
        window.$message.error($t("workbench.assets.deleteFail"));
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

function getMediaType(src?: string): MediaType {
  if (!src) return "unknown";
  const ext = src.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "unknown";
}

const mediaPreviewShow = ref(false);
const mediaPreviewSrc = ref("");
const mediaPreviewType = ref<MediaType>("unknown");
const mediaPreviewName = ref("");

function openMediaPreview(src: string, name: string) {
  if (!src) return;
  mediaPreviewSrc.value = src;
  mediaPreviewType.value = getMediaType(src);
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
