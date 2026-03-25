<template>
  <div class="cornerScape f">
    <div class="left">
      <t-card shadow :title="$t('workbench.cornerScape.batchSettings')" class="card">
        <t-form labelAlign="top">
          <t-form-item :label="$t('workbench.cornerScape.quickActions')">
            <div class="quickActions">
              <t-button theme="primary" variant="outline" @click="selectByState('')">{{ $t('workbench.cornerScape.selectUngenerated') }}</t-button>
              <t-button theme="primary" variant="outline" @click="selectByState('生成成功')">{{ $t('workbench.cornerScape.selectGenerated') }}</t-button>
              <t-button theme="primary" variant="outline" @click="selectByState('生成失败')">{{ $t('workbench.cornerScape.selectFailed') }}</t-button>
              <t-button theme="primary" variant="outline" @click="toggleSelectAll">{{ $t('workbench.cornerScape.invertSelection') }}</t-button>
              <t-button theme="primary" variant="outline" @click="clearSelection">{{ $t('workbench.cornerScape.clearSelection') }}</t-button>
              <t-image-viewer :images="previewImages" :closeOnEscKeydown="true" :closeOnOverlay="true">
                <template #trigger="{ open }">
                  <t-button theme="primary" variant="outline" :disabled="!hasPreviewImages" @click="hasPreviewImages && open()">{{ $t('workbench.cornerScape.batchPreview') }}</t-button>
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
                { label: '1K', value: '1k' },
                { label: '2K', value: '2k' },
                { label: '4K', value: '4k' },
              ]"></t-select>
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.concurrency')">
            <t-input-number v-model="concurrentCount" autoWidth :placeholder="$t('workbench.cornerScape.concurrencyPh')"></t-input-number>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" block @click="batchGeneration">{{ $t('workbench.cornerScape.startBatch') }}</t-button>
          </t-form-item>
        </t-form>
      </t-card>
    </div>
    <div class="content">
      <t-card v-show="dataList.length > 0" shadow class="card" v-for="item in dataList" :key="item.id" @click.stop="openDrawer(item)">
        <div class="imageBox">
          <t-checkbox class="selectBox" :checked="selectedIds.includes(item.id)" @change="toggleSelect(item.id)" />
          <t-empty v-if="!item.state" type="maintenance" :title="$t('workbench.cornerScape.waitingGen')" />
          <div v-else-if="item.state === '生成中'" class="generatingBox">
            <t-loading />
            <span class="generatingText">{{ $t('workbench.cornerScape.generating') }}</span>
          </div>
          <t-empty v-else-if="item.state === '生成失败'" type="fail" :title="$t('workbench.cornerScape.genFailed')" />
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
              {{ item.type === "role" ? $t('workbench.cornerScape.typeRole') : item.type === "scene" ? $t('workbench.cornerScape.typeScene') : item.type === "tool" ? $t('workbench.cornerScape.typeTool') : $t('workbench.cornerScape.typeUnknown') }}
            </t-tag>
            <t-tag size="small" variant="outline" class="stateTag" v-if="item.model">
              {{ item.model }}
            </t-tag>
            <t-tag size="small" variant="outline" v-if="item.resolution">
              {{ item.resolution }}
            </t-tag>
          </div>
          <div class="prompt" v-if="item.prompt">
            {{ item.type === "role" ? $t('workbench.cornerScape.typeRole') : item.type === "scene" ? $t('workbench.cornerScape.typeScene') : item.type === "tool" ? $t('workbench.cornerScape.typeTool') : $t('workbench.cornerScape.typeUnknown') }}{{ $t('workbench.cornerScape.descriptionSuffix') }}{{ item.prompt }}
          </div>
        </div>
      </t-card>
      <t-empty v-if="dataList.length === 0" type="empty" :title="$t('workbench.cornerScape.operateScriptFirst')" />
      <t-drawer :closeBtn="true" closeOnEscKeydown :showOverlay="false" :footer="false" v-model:visible="drawerVisible" size="480px">
        <template #header>
          <div class="drawerHeader">
            <span>{{ currentItem?.name }} - {{ $t('workbench.cornerScape.individualConfig') }}</span>
            <t-tag size="medium" variant="light-outline" theme="warning">
              {{ currentItem?.type === "role" ? $t('workbench.cornerScape.typeRole') : currentItem?.type === "scene" ? $t('workbench.cornerScape.typeScene') : currentItem?.type === "tool" ? $t('workbench.cornerScape.typeTool') : $t('workbench.cornerScape.typeUnknown') }}
            </t-tag>
          </div>
        </template>
        <div v-if="currentItem" class="drawerImageBox">
          <t-empty v-if="!currentItem.state" type="maintenance" :title="$t('workbench.cornerScape.waitingGen')" />
          <div v-else-if="currentItem.state === '生成中'" class="generatingBox">
            <t-loading />
            <span class="generatingText">{{ $t('workbench.cornerScape.generating') }}</span>
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
          <t-form-item :label="$t('workbench.cornerScape.genModel')">
            <modelSelect v-model="selectValue" :type="`image`" />
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.resolution')">
            <t-select v-model="editForm.resolution" :placeholder="$t('workbench.cornerScape.resolutionPh')" :options="resolutionOptions" />
          </t-form-item>
          <t-form-item :label="$t('workbench.cornerScape.promptLabel')">
            <t-textarea v-model="editForm.prompt" :placeholder="$t('workbench.cornerScape.promptPh')" :autosize="{ minRows: 4, maxRows: 10 }" :disabled="polishing" />
          </t-form-item>
          <t-form-item>
            <div class="drawerActions">
              <t-button theme="default" variant="outline" :loading="polishing" @click="polishPrompts">
                <template #icon><t-icon name="edit" /></template>
                {{ $t('workbench.cornerScape.aiPolish') }}
              </t-button>
              <t-button theme="primary" @click="regenerateItem">
                <template #icon><t-icon name="refresh" /></template>
                {{ $t('workbench.cornerScape.regenerate') }}
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
import pLimit from "p-limit";

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
}

const checkboxValue = ref<string[]>([]);

const selectValue = ref("");
const resolution = ref("");
const concurrentCount = ref(1);
const resolutionOptions = [
  { label: "1K", value: "1k" },
  { label: "2K", value: "2k" },
  { label: "4K", value: "4k" },
];
const options = ref([
  { labelKey: 'workbench.cornerScape.filterRole', value: "role" },
  { labelKey: 'workbench.cornerScape.filterScene', value: "scene" },
  { labelKey: 'workbench.cornerScape.filterTool', value: "tool" },
]);

const translatedOptions = computed(() =>
  options.value.map(opt => ({
    ...opt,
    label: $t(opt.labelKey)
  }))
);
const dataList = ref<DataItem[]>([]);
const { project } = storeToRefs(projectStore());
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
const editForm = reactive({
  assetsId: 0,
  model: "",
  type: "",
  resolution: "",
  prompt: "",
  name: "",
});

function openDrawer(item: DataItem) {
  editForm.assetsId = item.id;
  editForm.name = item.name || "";
  editForm.type = item.type || "";
  editForm.model = item.model || "";
  currentItem.value = item;
  editForm.resolution = item.resolution || "";
  editForm.prompt = item.prompt ? item.prompt : item.describe;
  drawerVisible.value = true;
}

function setItemState(id: number, state: string) {
  const item = dataList.value.find((i) => i.id === id);
  if (item) item.state = state;
  if (currentItem.value?.id === id) currentItem.value.state = state;
}

function regenerateItem() {
  if (!currentItem.value) return;
  if (!selectValue.value) {
    window.$message.warning($t('workbench.cornerScape.msg.selectModel'));
    return;
  }
  if (!editForm.resolution) {
    window.$message.warning($t('workbench.cornerScape.msg.selectResolution'));
    return;
  }
  if (!editForm.prompt.trim()) {
    window.$message.warning($t('workbench.cornerScape.msg.enterPrompt'));
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
        name: item.name ?? $t('workbench.cornerScape.unnamed'),
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
      window.$message.success($t('workbench.cornerScape.msg.genSuccess', { name: item.name }));
      await getFilteredData();
    })
    .catch((e: any) => {
      if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
      window.$message.error(e.message ?? $t('workbench.cornerScape.msg.genFailed', { name: item.name }));
      setItemState(item.id, "生成失败");
    });
}

// AI 润色
const polishing = ref(false);
async function polishPrompts() {
  if (!editForm.prompt.trim()) {
    window.$message.warning($t('workbench.cornerScape.msg.enterPromptFirst'));
    return;
  }
  polishing.value = true;
  try {
    const { data } = await axios.post("/assetsGenerate/polishAssetsPrompt", {
      projectId: project.value?.id,
      assetsId: editForm.assetsId,
      type: editForm.type ?? "props",
      name: editForm.name,
      describe: editForm.prompt ? editForm.prompt : $t('workbench.cornerScape.noDescription'),
    });
    window.$message.success($t('workbench.cornerScape.msg.promptGenSuccess'));
    if (data.assetsId === editForm.assetsId) {
      editForm.prompt = data.prompt;
    }
    getFilteredData();
  } catch {
    window.$message.error($t('workbench.cornerScape.msg.polishFailed'));
  } finally {
    polishing.value = false;
  }
}
// 批量生成
async function batchGeneration() {
  if (selectedIds.value.length === 0) {
    window.$message.warning($t('workbench.cornerScape.msg.selectAtLeastOne'));
    return;
  }
  if (!selectValue.value) {
    window.$message.warning($t('workbench.cornerScape.msg.selectModel'));
    return;
  }
  if (!resolution.value) {
    window.$message.warning($t('workbench.cornerScape.msg.selectResolution'));
    return;
  }

  const items = dataList.value.filter((item) => selectedIds.value.includes(item.id));
  const concurrent = Math.max(1, concurrentCount.value || 1);
  const limit = pLimit(concurrent);
  const controller = createAbortController();

  window.$message.success($t('workbench.cornerScape.msg.batchStarted', { count: items.length, concurrent }));

  const tasks = items.map((item) =>
    limit(async () => {
      if (controller.signal.aborted) return;
      setItemState(item.id, "生成中");
      try {
        await axios.post(
          "/assetsGenerate/generateAssets",
          {
            type: item.type ?? "props",
            projectId: project.value?.id,
            name: item.name ?? $t('workbench.cornerScape.unnamed'),
            base64: "",
            prompt: item.prompt || item.describe,
            model: selectValue.value,
            id: item.id,
            resolution: resolution.value,
            concurrentCount: 1,
          },
          { signal: controller.signal },
        );
        setItemState(item.id, "生成成功");
        await getFilteredData();
      } catch (e: any) {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        window.$message.error($t('workbench.cornerScape.msg.batchItemFailed', { name: item.name, error: e.message ?? '' }));
        setItemState(item.id, "生成失败");
      }
    }),
  );

  await Promise.all(tasks);
  if (!controller.signal.aborted) {
    window.$message.success($t('workbench.cornerScape.msg.batchComplete'));
  }
}
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
    margin-right: 1rem;
    margin-bottom: 1rem;
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
      gap: 0.75rem;
    }
    :deep(.t-form__item) {
      margin-bottom: 0;
    }
    .quickActions {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      width: 100%;
      :deep(.t-button) {
        width: 100%;
      }
    }
    .filterGroup {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
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
    gap: 1rem;
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
          top: 0.5rem;
          left: 0.5rem;
          z-index: 10;
        }
        .generatingBox {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%);
          .generatingText {
            font-size: 0.8125rem;
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
        padding: 0.5rem 0;
        overflow: hidden;
        cursor: pointer;
        .title {
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-top: 0.25rem;
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
          margin-top: 0.25rem;
          font-size: 0.75rem;
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
  gap: 0.5rem;
}

.drawerImageBox {
  width: 100%;
  min-height: 120px;
  max-height: 400px;
  background-color: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 1rem;
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
    gap: 0.75rem;
    .generatingText {
      font-size: 0.8125rem;
      color: var(--td-brand-color);
    }
  }
  .imageToolsWrap {
    opacity: 1;
    pointer-events: auto;
  }
}

.drawerActions {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  :deep(.t-button) {
    flex: 1;
  }
}
</style>
