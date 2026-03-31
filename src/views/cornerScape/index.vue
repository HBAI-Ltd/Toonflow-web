<template>
  <div class="cornerScape f">
    <div class="left">
      <t-card shadow :title="$t('workbench.cornerScape.batchSettings')" class="card">
        <t-form labelAlign="top">
          <t-form-item :label="$t('workbench.cornerScape.quickActions')">
            <div class="quickActions">
              <t-button theme="primary" variant="outline" @click="selectByState('')">{{ $t("workbench.cornerScape.selectUngenerated") }}</t-button>
              <t-button theme="primary" variant="outline" @click="selectByState('已完成')">
                {{ $t("workbench.cornerScape.selectGenerated") }}
              </t-button>
              <t-button theme="primary" variant="outline" @click="selectByState('生成失败')">{{ $t("workbench.cornerScape.selectFailed") }}</t-button>
              <t-button theme="primary" variant="outline" @click="toggleSelectAll">{{ $t("workbench.cornerScape.invertSelection") }}</t-button>
              <t-button theme="primary" variant="outline" @click="clearSelection">{{ $t("workbench.cornerScape.clearSelection") }}</t-button>
              <t-image-viewer :images="previewImages" :closeOnEscKeydown="true" :closeOnOverlay="true">
                <template #trigger="{ open }">
                  <t-button theme="primary" variant="outline" :disabled="!hasPreviewImages" @click="hasPreviewImages && open()">
                    {{ $t("workbench.cornerScape.batchPreview") }}
                  </t-button>
                </template>
              </t-image-viewer>
            </div>
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.assetTypeFilter')">
            <t-checkbox-group @change="onChangeFn" v-model="checkboxValue" :options="translatedOptions" class="filterGroup" />
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.genModel')">
            <modelSelect v-model="selectValue" :type="`image`" />
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.resolution')">
            <t-select
              v-model="resolution"
              :placeholder="$t('workbench.cornerScape.resolutionPh')"
              :options="[
                { label: '1K', value: '1K' },
                { label: '2K', value: '2K' },
                { label: '4K', value: '4K' },
              ]"></t-select>
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.concurrency')">
            <t-input-number
              v-model="concurrentCount"
              :min="1"
              :allowInputOverLimit="false"
              autoWidth
              :placeholder="$t('workbench.cornerScape.concurrencyPh')"></t-input-number>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" block @click="batchGenerationPrompt">{{ $t("workbench.cornerScape.batchGenerationPrompt") }}</t-button>
            <t-button theme="primary" block @click="batchGenerationImage" style="margin-left: 10px">
              {{ $t("workbench.cornerScape.startBatch") }}
            </t-button>
          </t-form-item>
        </t-form>
      </t-card>
    </div>
    <div class="content">
      <t-card v-show="dataList.length > 0" shadow class="card" v-for="item in dataList" :key="item.id" @click="openDrawer(item)">
        <div class="imageBox">
          <t-checkbox class="selectBox" :checked="selectedIds.includes(item.id)" @click.stop @change="toggleSelect(item.id)" />
          <t-empty v-if="!item.state && item.promptState !== '生成中'" type="maintenance" :title="$t('workbench.cornerScape.waitingGen')" />
          <div v-else-if="item.state === '生成中' || item.promptState === '生成中'" class="generatingBox">
            <t-loading />
            <span class="generatingText">
              {{ item.promptState === "生成中" ? $t("workbench.cornerScape.generatingPrompt") : $t("workbench.cornerScape.generating") }}
            </span>
          </div>
          <t-popup :content="item.errorReason" v-else-if="item.state === '生成失败'">
            <t-empty type="fail" :title="$t('workbench.cornerScape.genFailed')" />
          </t-popup>
          <t-image v-else class="image" :src="item.filePath ?? undefined" fit="contain" :preview="true" :lazy="true">
            <template #error>
              <t-empty type="fail" :title="$t('workbench.cornerScape.imageError')" />
            </template>
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="item.filePath!" position="br" />
              </div>
            </template>
          </t-image>
        </div>
        <div class="infoBox">
          <div class="title">{{ item.name }}</div>
          <div class="meta">
            <t-tag size="small" variant="light-outline" theme="warning" class="typeTag">
              {{
                item.type === "role"
                  ? $t("workbench.cornerScape.typeRole")
                  : item.type === "scene"
                    ? $t("workbench.cornerScape.typeScene")
                    : item.type === "tool"
                      ? $t("workbench.cornerScape.typeTool")
                      : $t("workbench.cornerScape.typeUnknown")
              }}
            </t-tag>
            <t-tag size="small" variant="outline" class="stateTag" v-if="item.model">
              {{ item.model }}
            </t-tag>
            <t-tag size="small" variant="outline" v-if="item.resolution">
              {{ item.resolution }}
            </t-tag>
          </div>
          <div class="prompt" v-if="item.describe">
            {{
              item.type === "role"
                ? $t("workbench.cornerScape.typeRole")
                : item.type === "scene"
                  ? $t("workbench.cornerScape.typeScene")
                  : item.type === "tool"
                    ? $t("workbench.cornerScape.typeTool")
                    : $t("workbench.cornerScape.typeUnknown")
            }}{{ $t("workbench.cornerScape.descriptionSuffix") }}{{ item.describe }}
          </div>
        </div>
      </t-card>
      <t-empty v-if="dataList.length === 0" type="empty" :title="$t('workbench.cornerScape.operateScriptFirst')" />
      <t-drawer :closeBtn="true" closeOnEscKeydown :showOverlay="false" :footer="false" v-model:visible="drawerVisible" size="480px">
        <template #header>
          <div class="drawerHeader">
            <span>{{ currentItem?.name }} - {{ $t("workbench.cornerScape.individualConfig") }}</span>
            <t-tag size="medium" variant="light-outline" theme="warning">
              {{
                currentItem?.type === "role"
                  ? $t("workbench.cornerScape.typeRole")
                  : currentItem?.type === "scene"
                    ? $t("workbench.cornerScape.typeScene")
                    : currentItem?.type === "tool"
                      ? $t("workbench.cornerScape.typeTool")
                      : $t("workbench.cornerScape.typeUnknown")
              }}
            </t-tag>
          </div>
        </template>
        <div v-if="currentItem" class="drawerImageBox">
          <t-empty v-if="!currentItem.state" type="maintenance" :title="$t('workbench.cornerScape.waitingGen')" />
          <div v-else-if="currentItem.state === '生成中'" class="generatingBox">
            <t-loading />
            <span class="generatingText">{{ $t("workbench.cornerScape.generating") }}</span>
          </div>
          <t-empty v-else-if="currentItem.state === '生成失败'" type="fail" :title="$t('workbench.cornerScape.genFailed')" />
          <t-image v-else-if="currentItem.filePath" class="image" :src="currentItem.filePath" fit="contain">
            <template #error>
              <t-empty type="fail" :title="$t('workbench.cornerScape.imageError')" />
            </template>
            <template #overlayContent>
              <div class="imageToolsWrap show">
                <ImageTools :src="currentItem.filePath!" position="br" />
              </div>
            </template>
          </t-image>
          <t-empty v-else type="maintenance" :title="$t('workbench.cornerScape.noImage')" />
        </div>
        <t-form v-if="currentItem" labelAlign="top">
          <t-form-item :label="$t('workbench.cornerScape.history')">
            <div class="historyImageList f">
              <div
                v-for="item in currentItem.historyImages"
                :key="item.id"
                class="historyImageItem"
                :class="{ selected: selectedHistoryId === item.id }"
                @click.stop="toggleHistorySelect(item.id)">
                <t-image :src="item.filePath" :style="{ width: '100px', minWidth: '100px', height: '100px' }" :lazy="true" fit="contain" />
              </div>
            </div>
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.genModel')">
            <modelSelect v-model="selectValue" :type="`image`" />
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.resolution')">
            <t-select v-model="editForm.resolution" :placeholder="$t('workbench.cornerScape.resolutionPh')" :options="resolutionOptions" />
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.promptLabel')">
            <t-textarea
              v-model="editForm.prompt"
              :placeholder="$t('workbench.cornerScape.promptPh')"
              :autosize="{ minRows: 4, maxRows: 10 }"
              :disabled="polishing"
              @blur="savePromptOnBlur" />
          </t-form-item>
          <t-form-item>
            <div class="drawerActions">
              <t-button theme="default" variant="outline" :loading="polishing" @click="polishPrompts">
                <template #icon><t-icon name="edit" /></template>
                {{ $t("workbench.cornerScape.aiPolish") }}
              </t-button>
              <t-button theme="primary" @click="regenerateItem">
                <template #icon><t-icon name="refresh" /></template>
                {{ $t("workbench.cornerScape.regenerate") }}
              </t-button>
            </div>
          </t-form-item>
        </t-form>
      </t-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import modelSelect from "@/components/modelSelect.vue";
interface Image {
  filePath: string;
  id: number;
}
interface DataItem {
  id: number;
  type: string;
  name: string;
  prompt: string;
  filePath: string | null;
  state: string;
  model: string;
  resolution: string;
  describe: string;
  promptState: string;
  historyImages: Image[];
  errorReason: string;
  promptErrorReason: string;
}

const checkboxValue = ref<string[]>([]);
const { project } = storeToRefs(projectStore());
const selectValue = ref(project.value?.imageModel ?? "");
const resolution = ref("1K");
const concurrentCount = ref(5);
const resolutionOptions = [
  { label: "1K", value: "1K" },
  { label: "2K", value: "2K" },
  { label: "4K", value: "4K" },
];
const options = ref([
  { labelKey: "workbench.cornerScape.filterRole", value: "role" },
  { labelKey: "workbench.cornerScape.filterScene", value: "scene" },
  { labelKey: "workbench.cornerScape.filterTool", value: "tool" },
]);

const translatedOptions = computed(() =>
  options.value.map((opt) => ({
    ...opt,
    label: $t(opt.labelKey),
  })),
);
const dataList = ref<DataItem[]>([]);
const loading = ref(false);

// 用于取消进行中的生成请求
let abortController: AbortController | null = null;

function createAbortController() {
  abortController?.abort();
  abortController = new AbortController();
  return abortController;
}

onMounted(() => {
  getFilteredData();
});

onUnmounted(() => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  stopPolling();
  stopImagePolling();
  // 将所有"生成中"的项重置为空状态
  dataList.value.forEach((item) => {
    if (item.state === "生成中") item.state = "";
  });
});
function onChangeFn() {
  getFilteredData();
}
async function getFilteredData() {
  try {
    loading.value = true;
    const { data } = await axios.post("/cornerScape/getAllAssets", {
      projectId: project.value?.id,
      type: checkboxValue.value,
    });
    dataList.value = data;
  } catch (error) {
    console.error("加载资产数据失败:", error);
    dataList.value = [];
  } finally {
    loading.value = false;
  }
}

const selectedIds = ref<number[]>([]);

const previewImages = computed((): string[] => {
  const selectedImageList = dataList.value
    .filter((item) => selectedIds.value.includes(item.id) && item.filePath)
    .map((item) => item.filePath as string);

  if (selectedImageList.length > 0) {
    return selectedImageList;
  }

  return dataList.value.filter((item) => item.filePath).map((item) => item.filePath as string);
});

const hasPreviewImages = computed(() => previewImages.value.length > 0);

const toggleSelect = (id: number) => {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(idx, 1);
};

const selectByState = (state: string) => {
  selectedIds.value = dataList.value.filter((item) => (state === "" ? !item.state : item.state === state)).map((item) => item.id);
};

function toggleSelectAll() {
  if (selectedIds.value.length === dataList.value.length) {
    selectedIds.value = [];
  } else {
    selectedIds.value = dataList.value.map((item) => item.id);
  }
}
function clearSelection() {
  selectedIds.value = [];
}

// Drawer
const drawerVisible = ref(false);
const currentItem = ref<DataItem | null>(null);
const selectedHistoryId = ref<number | null>(null);

async function toggleHistorySelect(id: number) {
  selectedHistoryId.value = selectedHistoryId.value === id ? null : id;
  if (!currentItem.value) return;
  const selectedImage = currentItem.value.historyImages.find((img) => img.id === selectedHistoryId.value);
  try {
    await axios.post("/assets/saveAssets", {
      id: currentItem.value.id,
      type: currentItem.value.type,
      projectId: project.value?.id,
      prompt: currentItem.value.prompt,
      imageId: selectedImage?.id,
    });
    //拿选中的图片替换当前图片
    if (selectedImage) {
      currentItem.value.filePath = selectedImage.filePath;
      currentItem.value.state = "已完成";
    }
    getFilteredData();
    window.$message.success($t("workbench.cornerScape.msg.replaceSuccess"));
  } catch (e) {
    window.$message.error($t("workbench.cornerScape.msg.replaceFailed"));
    return;
  }
}

const editForm = reactive({
  assetsId: 0,
  model: "",
  type: "",
  resolution: "",
  prompt: "",
  name: "",
  describe: "",
});

async function openDrawer(item: DataItem) {
  selectedHistoryId.value = null;
  // 先用当前数据打开抽屉
  editForm.assetsId = item.id;
  editForm.name = item.name || "";
  editForm.type = item.type || "";
  editForm.model = item.model || "";
  currentItem.value = item;
  editForm.resolution = item.resolution || "";
  editForm.prompt = item.prompt || "";
  editForm.describe = item.describe || "";
  drawerVisible.value = true;
  // 重新获取最新数据（含历史图片）
  try {
    const { data } = await axios.post("/cornerScape/getAllAssets", {
      projectId: project.value?.id,
      type: checkboxValue.value,
    });
    const freshItem = (data as DataItem[]).find((d) => d.id === item.id);
    if (freshItem) {
      // 更新 dataList 中对应项
      const idx = dataList.value.findIndex((d) => d.id === item.id);
      if (idx !== -1) dataList.value[idx] = freshItem;
      // 更新当前抽屉项
      currentItem.value = freshItem;
      editForm.prompt = freshItem.prompt || editForm.prompt;
      editForm.resolution = freshItem.resolution || editForm.resolution;
    }
  } catch (e) {
    console.error("刷新资产详情失败:", e);
  }
}

function setItemState(id: number, state: string) {
  const item = dataList.value.find((i) => i.id === id);
  if (item) item.state = state;
  if (currentItem.value?.id === id) currentItem.value.state = state;
}

function regenerateItem() {
  if (!currentItem.value) return;
  if (!selectValue.value) {
    window.$message.warning($t("workbench.cornerScape.msg.selectModel"));
    return;
  }
  if (!editForm.resolution) {
    window.$message.warning($t("workbench.cornerScape.msg.selectResolution"));
    return;
  }
  if (!editForm.prompt.trim()) {
    window.$message.warning($t("workbench.cornerScape.msg.enterPrompt"));
    return;
  }
  const item = currentItem.value;
  setItemState(item.id, "生成中");
  drawerVisible.value = false;
  const controller = createAbortController();
  axios
    .post(
      "/assetsGenerate/generateAssets",
      {
        type: item.type ?? "props",
        projectId: project.value?.id,
        name: item.name ?? $t("workbench.cornerScape.unnamed"),
        base64: "",
        prompt: editForm.prompt,
        model: selectValue.value,
        id: item.id,
        resolution: editForm.resolution,
        concurrentCount: 1,
      },
      { signal: controller.signal },
    )
    .then(async () => {
      window.$message.success($t("workbench.cornerScape.msg.genSuccess", { name: item.name }));
      await getFilteredData();
    })
    .catch((e: any) => {
      if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
      window.$message.error(e.message ?? $t("workbench.cornerScape.msg.genFailed", { name: item.name }));
      setItemState(item.id, "生成失败");
    });
}

// 提示词失焦保存
async function savePromptOnBlur() {
  if (!currentItem.value) return;
  // 内容没有变化则不保存
  if (editForm.prompt === currentItem.value.prompt) return;
  try {
    await axios.post("/assets/saveAssets", {
      id: currentItem.value.id,
      type: currentItem.value.type,
      projectId: project.value?.id,
      prompt: editForm.prompt,
    });
    // 同步更新本地数据
    currentItem.value.prompt = editForm.prompt;
    const target = dataList.value.find((d) => d.id === currentItem.value!.id);
    if (target) target.prompt = editForm.prompt;
    window.$message.success($t("workbench.cornerScape.msg.saveSuccess"));
  } catch (e) {
    window.$message.error($t("workbench.cornerScape.msg.saveFailed"));
  }
}

// AI 润色
const polishing = ref(false);
async function polishPrompts() {
  if (!editForm.prompt.trim()) {
    window.$message.warning($t("workbench.cornerScape.msg.enterPromptFirst"));
    return;
  }
  polishing.value = true;
  try {
    const { data } = await axios.post("/assetsGenerate/polishAssetsPrompt", {
      projectId: project.value?.id,
      assetsId: editForm.assetsId,
      type: editForm.type ?? "props",
      name: editForm.name,
      describe: editForm.describe,
    });
    window.$message.success($t("workbench.cornerScape.msg.promptGenSuccess"));
    if (data.assetsId === editForm.assetsId) {
      editForm.prompt = data.prompt;
    }
    getFilteredData();
  } catch {
    window.$message.error($t("workbench.cornerScape.msg.polishFailed"));
  } finally {
    polishing.value = false;
  }
}
//批量生成提示词
async function batchGenerationPrompt() {
  if (selectedIds.value.length === 0) {
    window.$message.warning($t("workbench.cornerScape.msg.selectAtLeastOne"));
    return;
  }

  const items = dataList.value.filter((item) => selectedIds.value.includes(item.id));

  // 前端先将所有选中项的 promptState 标记为"生成中"，让轮询自动接管状态跟踪
  items.forEach((item) => {
    item.promptState = "生成中";
  });

  // 清除已选中的项
  selectedIds.value = [];
  const concurrent = Math.max(1, concurrentCount.value || 1);

  try {
    await axios.post("/assetsGenerate/batchPolishAssetsPrompt", {
      projectId: project.value?.id,
      items: items.map((item) => ({
        assetsId: item.id,
        type: item.type ?? "props",
        name: item.name,
        describe: item.describe,
      })),
      concurrentCount: concurrent,
    });
  } catch (e: any) {
    window.$message.error(e.message ?? $t("workbench.cornerScape.msg.promptGenFail"));
    // 生成失败时重置 promptState
    items.forEach((item) => {
      const target = dataList.value.find((row) => row.id === item.id);
      if (target) target.promptState = "";
    });
  }
}
// 批量生成图片
async function batchGenerationImage() {
  if (selectedIds.value.length === 0) {
    window.$message.warning($t("workbench.cornerScape.msg.selectAtLeastOne"));
    return;
  }
  if (!selectValue.value) {
    window.$message.warning($t("workbench.cornerScape.msg.selectModel"));
    return;
  }
  if (!resolution.value) {
    window.$message.warning($t("workbench.cornerScape.msg.selectResolution"));
    return;
  }

  const items = dataList.value.filter((item) => selectedIds.value.includes(item.id));
  //检查如果勾选的数据prompt有空的，提示用户勾选的哪一个提示词未生成，然后终止批量生成
  const emptyPrompts = items.filter((item) => !item.prompt);
  if (emptyPrompts.length > 0) {
    const emptyPromptNames = emptyPrompts.map((item) => item.name).join(", ");
    window.$message.warning(
      $t("workbench.cornerScape.msg.emptyPrompt", {
        emptyPromptNames,
      }),
    );
    return;
  }
  const concurrent = Math.max(1, concurrentCount.value || 1);

  // 前端先将所有选中项标记为"生成中"
  items.forEach((item) => setItemState(item.id, "生成中"));

  window.$message.success($t("workbench.cornerScape.msg.batchStarted", { count: items.length, concurrent }));

  try {
    await axios.post("/assetsGenerate/batchGenerateImageAssets", {
      projectId: project.value?.id,
      model: selectValue.value,
      resolution: resolution.value,
      concurrentCount: concurrent,
      items: items.map((item) => ({
        id: item.id,
        type: item.type ?? "props",
        name: item.name ?? $t("workbench.cornerScape.unnamed"),
        prompt: item.prompt,
      })),
    });
    window.$message.success($t("workbench.cornerScape.msg.batchComplete"));
  } catch (e: any) {
    if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
    window.$message.error(e.message ?? $t("workbench.cornerScape.msg.batchFailed"));
  }
}
//轮询
const notCompultedData = computed(() => {
  return dataList.value.filter((item) => item.promptState == "生成中");
});
const generatingData = computed(() => {
  return dataList.value.filter((item) => item.state === "生成中");
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
        const target = dataList.value.find((row) => row.id === item.id);
        if (target) {
          target.promptState = item.promptState;
          if (item.prompt !== undefined) target.prompt = item.prompt;
        }
      });
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
    let hasCompleted = false;
    if (Array.isArray(data) && data.length) {
      data.forEach((item: { id: number; state: string; filePath: string }) => {
        const target = dataList.value.find((row) => row.id === item.id);
        if (target) {
          if (target.state === "生成中" && item.state !== "生成中") hasCompleted = true;
          target.state = item.state;
          if (item.filePath !== undefined) target.filePath = item.filePath;
        }
      });
    }
    // 有图片生成完成时，重新获取完整数据以刷新 historyImages
    if (hasCompleted) {
      try {
        const { data: freshData } = await axios.post("/cornerScape/getAllAssets", {
          projectId: project.value?.id,
          type: checkboxValue.value,
        });
        (freshData as DataItem[]).forEach((fresh) => {
          const target = dataList.value.find((row) => row.id === fresh.id);
          if (target) target.historyImages = fresh.historyImages;
        });
        // 同步更新抽屉中的当前项
        if (currentItem.value) {
          const freshCurrent = (freshData as DataItem[]).find((d) => d.id === currentItem.value!.id);
          if (freshCurrent) currentItem.value.historyImages = freshCurrent.historyImages;
        }
      } catch (e) {
        console.error("刷新历史图片失败:", e);
      }
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
</script>

<style lang="scss" scoped>
.cornerScape {
  width: 100%;
  height: 100%;
  min-height: 0;
  align-items: flex-start;
  .left {
    overflow: hidden;
    width: clamp(240px, 22vw, 320px);
    height: fit-content;
    min-height: 0;
    flex-shrink: 0;
    margin-right: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    .card {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      :deep(.t-card__body) {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
    }
    :deep(.t-form) {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    :deep(.t-form__item) {
      margin-bottom: 0;
    }
    .quickActions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      :deep(.t-button) {
        width: 100%;
      }
    }
    .filterGroup {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }
  .content {
    overflow: auto;
    height: 100%;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
    align-items: start;
    align-content: start;
    gap: 16px;
    .card {
      cursor: pointer;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      :deep(.t-card__body) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .imageBox {
        position: relative;
        width: 100%;
        height: 160px;
        background-color: #f5f7fa;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        .selectBox {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 10;
        }
        .generatingBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
          .generatingText {
            font-size: 13px;
            color: var(--td-brand-color);
            letter-spacing: 0.05em;
          }
        }
        .image {
          width: 100%;
          height: 100%;
          :deep(.t-image__img) {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        }
        .imageToolsWrap {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        :deep(.t-empty) {
          width: 100%;
        }
      }
      &:hover {
        .imageToolsWrap {
          opacity: 1;
          pointer-events: auto;
        }
      }
      .infoBox {
        flex: 1;
        padding: 8px 0;
        overflow: hidden;
        cursor: pointer;
        .title {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
          .typeTag {
            flex-shrink: 0;
          }
          .stateTag {
            flex-shrink: 0;
          }
          .modelTag {
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
            :deep(.t-tag__text) {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
        .prompt {
          margin-top: 4px;
          font-size: 12px;
          color: var(--td-text-color-secondary);
          line-height: 1.5;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }
    }
  }
}

.drawerHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawerImageBox {
  width: 100%;
  min-height: 120px;
  max-height: 400px;
  background-color: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  .image {
    width: 100%;
    height: auto;
    :deep(.t-image__img) {
      max-height: 400px;
      object-fit: contain;
    }
  }
  .generatingBox {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    .generatingText {
      font-size: 13px;
      color: var(--td-brand-color);
    }
  }
  .imageToolsWrap {
    opacity: 1;
    pointer-events: auto;
  }
}

.historyImageList {
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  width: 0;
  min-width: 100%;
  flex-shrink: 1;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.historyImageItem {
  border-radius: 4px;
  border: 3px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s;
  flex-shrink: 0;
  overflow: hidden;

  &:hover {
    border-color: var(--td-brand-color-light);
  }
  &.selected {
    border-color: var(--td-brand-color);
  }
}

.drawerActions {
  display: flex;
  gap: 8px;
  width: 100%;
  :deep(.t-button) {
    flex: 1;
  }
}
</style>
