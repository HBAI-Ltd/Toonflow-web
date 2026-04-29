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
                  <t-button theme="primary" v-if="assetOptions != 'clip' && assetOptions != 'audio'">
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
                v-if="['role', 'tool', 'scene'].includes(assetOptions)"
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
                    <t-table
                      :columns="subColumns"
                      :data="row.sonAssets || []"
                      :selected-row-keys="selectedSubRowKeys"
                      row-key="id"
                      hover
                      size="small"
                      table-layout="fixed"
                      :select-on-row-click="false"
                      @select-change="handleSubSelectChange">
                      <template #previewWithLoading="{ row: subRow }">
                        <div class="previewCell">
                          <div v-if="subRow.state === '生成中'" class="imageTrigger generatingImage">
                            <t-loading size="small" />
                            <span class="generatingLabel">{{ $t("workbench.assets.generating") }}</span>
                          </div>
                          <t-image-viewer v-else :images="[subRow.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                            <template #trigger="{ open }">
                              <div class="imageTrigger" @click="subRow.src && getBigImageUrl(subRow, open())">
                                <img v-if="subRow.src" :src="subRow.src" :alt="subRow.name" class="previewImage" />
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
                      <template #prompt="{ row: subRow }">
                        <div class="promptCell">
                          <t-loading v-if="subRow.promptState === '生成中'" size="small" style="margin-right: 4px" />
                          <span :class="{ 'generating-text': subRow.promptState === '生成中' }">{{ subRow.prompt }}</span>
                        </div>
                      </template>
                      <template #operation="{ row: subRow }">
                        <t-space :size="0">
                          <t-button theme="primary" variant="text" :disabled="isGenerating(subRow.id)" @click="generate(subRow)">
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
                          <t-button theme="danger" variant="text" :disabled="isGenerating(subRow.id)" @click="handleDelete(subRow)">
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
                        <div class="imageTrigger" @click="row.src && getBigImageUrl(row, open())">
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
                    <t-loading v-if="row.promptState === '生成中'" size="small" style="margin-right: 4px" />
                    <span :class="{ 'generating-text': row.promptState === '生成中' }">{{ row.prompt }}</span>
                  </div>
                </template>
                <template #previewWithLoading="{ row }">
                  <div class="previewCell">
                    <div v-if="row.state === '生成中'" class="imageTrigger generatingImage">
                      <t-loading size="small" />
                      <span class="generatingLabel">{{ $t("workbench.assets.generating") }}</span>
                    </div>
                    <t-image-viewer v-else :images="[row.src]" :closeOnEscKeydown="true" :closeOnOverlay="true">
                      <template #trigger="{ open }">
                        <div class="imageTrigger" @click="row.src && getBigImageUrl(row, open())">
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
              <t-table
                v-if="assetOptions == 'audio'"
                :columns="audioColumns"
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
                <template #expandedRow="{ row }" v-if="!selectorMode">
                  <div class="expandedContent">
                    <t-table
                      :columns="subAudioColumns"
                      :data="row.sonAssets || []"
                      :selected-row-keys="selectedSubRowKeys"
                      row-key="id"
                      hover
                      size="small"
                      table-layout="fixed"
                      stripe
                      :select-on-row-click="false"
                      @select-change="handleSubSelectChange">
                      <template #previewWithLoading="{ row: subRow }">
                        <div class="previewCell">
                          <div class="mediaTrigger audioThumb" @click="openMediaPreview(subRow.src, subRow.name)">
                            <t-icon name="music" size="28px" />
                            <div class="mediaHoverOverlay">
                              <t-icon name="play-circle" size="24px" />
                              <span class="hoverText">{{ $t("workbench.assets.play") }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template #prompt="{ row: subRow }">
                        <div class="promptCell">
                          <span>{{ subRow.prompt }}</span>
                        </div>
                      </template>
                      <template #operation="{ row: subRow }">
                        <t-space :size="0">
                          <t-button theme="danger" variant="text" :disabled="isGenerating(subRow.id)" @click="handleDelete(subRow)">
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
                    <div class="mediaTrigger audioThumb" @click="openMediaPreview(row.src, row.name)">
                      <t-icon name="music" size="28px" />
                      <div class="mediaHoverOverlay">
                        <t-icon name="play-circle" size="24px" />
                        <span class="hoverText">{{ $t("workbench.assets.play") }}</span>
                      </div>
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

    <addAudioAssets v-model="addAudioShow" v-if="addAudioShow" :formData="audioFormData" @getFilteredData="getFilteredData(assetOptions)" />
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
              <t-option key="1K" label="1K" value="1K" />
              <t-option key="2K" label="2K" value="2K" />
              <t-option key="4K" label="4K" value="4K" />
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
import addAudioAssets from "./components/addAudioAssets.vue";
import generateImage from "./components/generateImage.vue";
import projectStore from "@/stores/project";
import settingStore from "@/stores/setting";
const { otherSetting } = storeToRefs(settingStore());

const props = withDefaults(
  defineProps<{
    /** 是否作为选择器弹窗使用 */
    selectorMode?: boolean;
    /** 限制显示的资产类型 */
    allowedTypes?: ("role" | "tool" | "scene" | "clip" | "audio")[];
    /** 当类型为 clip 时，限制媒体子类型 */
    clipMediaTypes?: ("image" | "video" | "audio")[];
    /** 是否多选 */
    multiple?: boolean;
  }>(),
  {
    selectorMode: false,
    multiple: true,
  },
);
const addAudioShow = ref(false);

const audioFormData = ref({
  name: "",
  describe: "",
  sex: "",
});

onMounted(() => {
  loadCurrentTabData();
});

onUnmounted(() => {
  stopPolling();
  stopImagePolling();
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
  {
    name: $t("workbench.assets.audio"),
    value: "audio",
    icon: "i-audio-file",
  },
];
const themeData = ref(props.allowedTypes?.length ? allThemeData.filter((item) => props.allowedTypes!.includes(item.value as any)) : allThemeData);

const initialTab = (themeData.value[0]?.value || "role") as "role" | "tool" | "scene" | "clip";
const assetOptions = ref<"role" | "tool" | "scene" | "clip" | "audio">(initialTab);
const searchText = ref("");

const tabNameMap: Record<string, string> = {
  role: $t("workbench.assets.role"),
  tool: $t("workbench.assets.prop"),
  scene: $t("workbench.assets.scene"),
  clip: $t("workbench.assets.clip"),
  audio: $t("workbench.assets.audio"),
};
const selectedRowKeys = ref<Array<string | number>>([]);
const selectedSubRowKeys = ref<Array<string | number>>([]);
const expandedRowKeys = ref<Array<string | number>>([]);
const loading = ref(false);
// 是否正在处于任意生成中（提示词或图片），基于 item 的实际 state/promptState 判断
const isGenerating = (id: number) => {
  const item = findAssetById(id);
  return item?.promptState === "生成中" || item?.state === "生成中";
};
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
  state: string;
  sonAssets?: Asset[]; // 子资产列表
  imageId: number;
  promptState: string;
  filePath: string;
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
    // 当 clip 类型且指定了 clipMediaTypes 时，进行二次过滤
    if (type === "clip" && props.clipMediaTypes?.length) {
      tableData.value = tableData.value.filter((item) => {
        const mt = getMediaType(item.src);
        return props.clipMediaTypes!.includes(mt as any);
      });
    }
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
  } else if (assetOptions.value === "audio") {
    type = "音频";
  }
  await getFilteredData(assetOptions.value);
}
function selectAssetOptions(value: TabValue) {
  searchText.value = "";
  selectedRowKeys.value = [];
  selectedSubRowKeys.value = [];
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
  } else if (type == "audio") {
    addAudioShow.value = true;
    audioFormData.value = {
      name: "",
      describe: "",
      sex: "",
    };
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
const resolution = ref("1K"); //选择的分辨率
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
// 获取所有选中的子资产
function getSelectedSubAssets(): Asset[] {
  const subAssets: Asset[] = [];
  tableData.value.forEach((row) => {
    if (row.sonAssets?.length) {
      row.sonAssets.forEach((sub) => {
        if (selectedSubRowKeys.value.includes(sub.id)) {
          subAssets.push(sub);
        }
      });
    }
  });
  return subAssets;
}
// 批量生成提示词
async function handleBatchGeneratePrompt() {
  const selectedParentAssets = tableData.value.filter((item: any) => selectedRowKeys.value.includes(item.id));
  const selectedSubAssets = getSelectedSubAssets();
  const selectedAssets = [...selectedParentAssets, ...selectedSubAssets];
  if (selectedAssets.length === 0) {
    window.$message.warning($t("workbench.assets.selectAtLeastOne"));
    return;
  }
  // 设置 promptState 为 '生成中'，让轮询自动接管状态跟踪
  selectedParentAssets.forEach((asset) => {
    const target = tableData.value.find((row) => row.id === asset.id);
    if (target) target.promptState = "生成中";
  });
  selectedSubAssets.forEach((asset) => {
    tableData.value.forEach((row) => {
      const target = row.sonAssets?.find((sub) => sub.id === asset.id);
      if (target) target.promptState = "生成中";
    });
  });
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => !selectedParentAssets.some((a) => a.id === key));
  selectedSubRowKeys.value = selectedSubRowKeys.value.filter((key) => !selectedSubAssets.some((a) => a.id === key));
  batchGenerationShow.value = false;
  try {
    await axios.post("/assetsGenerate/batchPolishAssetsPrompt", {
      projectId: project.value?.id,
      concurrentCount: otherSetting.value.assetsBatchGenereateSize,
      items: selectedAssets.map((item: { id: number; name: string; type: string; describe: string }) => ({
        assetsId: item.id,
        type: item.type ?? "props",
        name: item.name,
        describe: item.describe ? item.describe : $t("workbench.assets.noDescription"),
      })),
    });
  } catch (e: any) {
    window.$message.error($t("workbench.assets.promptGenFail"));
  }
}
// 批量生成图片
async function handleBatchGenerateImage() {
  const selectedParentAssets = tableData.value.filter((item: any) => selectedRowKeys.value.includes(item.id));
  const selectedSubAssets = getSelectedSubAssets();
  const selectedAssets = [...selectedParentAssets, ...selectedSubAssets];
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

  // 过滤掉没有 prompt 的资产
  const validAssets = selectedAssets.filter((asset) => {
    if (!asset.prompt) {
      window.$message.warning($t("workbench.assets.noPromptForImage", { name: asset.name }));
      return false;
    }
    return true;
  });
  if (validAssets.length === 0) return;

  // 设置 state 为 '生成中'，让轮询自动接管状态跟踪
  const validParentAssets = validAssets.filter((a) => selectedRowKeys.value.includes(a.id));
  const validSubAssets = validAssets.filter((a) => selectedSubRowKeys.value.includes(a.id));
  validParentAssets.forEach((asset) => {
    const target = tableData.value.find((row) => row.id === asset.id);
    if (target) target.state = "生成中";
  });
  validSubAssets.forEach((asset) => {
    tableData.value.forEach((row) => {
      const target = row.sonAssets?.find((sub) => sub.id === asset.id);
      if (target) target.state = "生成中";
    });
  });
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => !validAssets.some((a) => a.id === key));
  selectedSubRowKeys.value = selectedSubRowKeys.value.filter((key) => !validAssets.some((a) => a.id === key));
  batchGenerationShow.value = false;

  try {
    await axios.post("/assetsGenerate/batchGenerateImageAssets", {
      projectId: project.value?.id,
      model: selectValue.value,
      resolution: resolution.value,
      concurrentCount: otherSetting.value.assetsBatchGenereateSize,
      items: validAssets.map((item) => ({
        id: item.id,
        type: item.type ?? "props",
        name: item.name ?? $t("workbench.cornerScape.unnamed"),
        prompt: item.prompt || item.describe,
      })),
    });
  } catch (e: any) {
    window.$message.error($t("workbench.assets.imageGenFail", { name: "", error: e.message ?? "" }));
    validAssets.forEach((asset) => {
      // 在父级和子级中都查找
      const parentTarget = tableData.value.find((row) => row.id === asset.id);
      if (parentTarget) {
        parentTarget.state = "生成失败";
      } else {
        tableData.value.forEach((row) => {
          const subTarget = row.sonAssets?.find((sub) => sub.id === asset.id);
          if (subTarget) subTarget.state = "生成失败";
        });
      }
    });
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

// 子资产表格列配置
const subColumns: TableProps["columns"] = [
  {
    colKey: "row-select",
    type: selectType,
    width: 50,
    align: "center",
    fixed: "left",
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
    width: 100,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "remark",
    title: $t("workbench.assets.colRemark"),
    minWidth: 150,
    align: "left",
    ellipsis: true,
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

//剪辑表格列配置
const clipColumns: TableProps["columns"] = [
  { colKey: "row-select", type: "multiple", width: 50, align: "center", fixed: "left" },
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
const audioColumns: TableProps["columns"] = [
  { colKey: "row-select", type: selectType, width: 50, align: "center", fixed: "left" },
  {
    colKey: "name",
    title: $t("workbench.assets.audioName"),
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    colKey: "sex",
    title: $t("workbench.assets.sex"),
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
const subAudioColumns: TableProps["columns"] = [
  {
    colKey: "row-select",
    type: selectType,
    width: 50,
    align: "center",
    fixed: "left",
  },
  {
    colKey: "src",
    title: $t("workbench.assets.colPreview"),
    width: 100,
    align: "center",
    cell: "previewWithLoading",
  },
  {
    colKey: "prompt",
    title: $t("workbench.assets.audioText"),
    width: 100,
    align: "left",
    ellipsis: true,
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
// 选择行（正在生成中的行不允许勾选）
function handleSelectChange(value: Array<string | number>) {
  const filtered = value.filter((key) => !isGenerating(key as number));
  if (!props.multiple) {
    selectedRowKeys.value = filtered.length > 0 ? [filtered[filtered.length - 1]] : [];
  } else {
    selectedRowKeys.value = filtered;
  }
}
// 子资产选择行
function handleSubSelectChange(value: Array<string | number>) {
  if (!props.multiple) {
    selectedSubRowKeys.value = value.length > 0 ? [value[value.length - 1]] : [];
  } else {
    selectedSubRowKeys.value = value;
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
  console.log(row);
  if (row.type == "audio") {
    audioFormData.value = {
      ...row,
    };
    addAudioShow.value = true;
  } else {
    formData.value = {
      ...row,
    };
    addAssetsShow.value = true;
  }
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
  selectedSubRowKeys,
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
//轮询
// 获取所有资产（包含父资产和子资产）的扁平列表
function getAllAssetsFlat(): Asset[] {
  const all: Asset[] = [];
  tableData.value.forEach((row) => {
    all.push(row);
    if (row.sonAssets?.length) {
      all.push(...row.sonAssets);
    }
  });
  return all;
}
// 在父资产和子资产中查找指定 id 的资产
function findAssetById(id: number): Asset | undefined {
  for (const row of tableData.value) {
    if (row.id === id) return row;
    const sub = row.sonAssets?.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}
const notCompultedData = computed(() => {
  return getAllAssetsFlat().filter((item) => item.promptState == "生成中");
});
const generatingData = computed(() => {
  return getAllAssetsFlat().filter((item) => item.state === "生成中");
});
// 轮询相关
let pollingTimer: ReturnType<typeof setInterval> | null = null;
let imagePollingTimer: ReturnType<typeof setInterval> | null = null;
//轮询提示词生成
async function pollingPromptAssets() {
  if (notCompultedData.value.length === 0) return;
  const ids = notCompultedData.value.map((item) => item.id);
  try {
    const { data } = await axios.post("/assets/pollingPromptAssets", { ids });
    if (Array.isArray(data) && data.length) {
      data.forEach((item: { id: number; promptState: string; prompt: string }) => {
        const target = findAssetById(item.id);
        if (target) {
          target.promptState = item.promptState;
          if (item.prompt !== undefined) target.prompt = item.prompt;
        }
      });
      getFilteredData(assetOptions.value);
    }
  } catch (e) {
    console.error("轮询提示词状态失败:", e);
  }
}
//轮询图片生成
async function pollingImageAssets() {
  if (generatingData.value.length === 0) return;
  const ids = generatingData.value.map((item) => item.id);
  try {
    const { data } = await axios.post("/assets/pollingImageAssets", { ids });
    if (Array.isArray(data) && data.length) {
      data.forEach((item: { id: number; state: string; filePath: string; src?: string }) => {
        const target = findAssetById(item.id);
        if (target) {
          target.state = item.state;
          if (item.filePath !== undefined) target.filePath = item.filePath;
          if (item.src !== undefined) target.src = item.src;
          // filePath 存在时也作为 src 使用，确保图片立即显示
          if (!item.src && item.filePath && item.state !== "生成中") {
            target.src = item.filePath;
          }
        }
      });
      getFilteredData(assetOptions.value);
    }
  } catch (e) {
    console.error("轮询图片生成状态失败:", e);
  }
}
function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(async () => {
    if (notCompultedData.value.length === 0) {
      stopPolling();
      return;
    }
    await pollingPromptAssets();
  }, 3000);
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

function startImagePolling() {
  if (imagePollingTimer) return;
  imagePollingTimer = setInterval(async () => {
    if (generatingData.value.length === 0) {
      stopImagePolling();
      return;
    }
    await pollingImageAssets();
  }, 3000);
}

function stopImagePolling() {
  if (imagePollingTimer) {
    clearInterval(imagePollingTimer);
    imagePollingTimer = null;
  }
}

watch(notCompultedData, (val) => {
  if (val.length > 0) {
    startPolling();
  } else {
    stopPolling();
  }
});

watch(generatingData, (val) => {
  if (val.length > 0) {
    startImagePolling();
  } else {
    stopImagePolling();
  }
});

async function getBigImageUrl(row: Asset, fn: Function) {
  const { data } = await axios.post("/common/getBigImage", {
    url: row.src,
  });
  row.src = data;
  nextTick(() => {
    fn();
  });
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
