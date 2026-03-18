<template>
  <div class="cornerScape f">
    <div class="left">
      <t-card shadow title="批量生成设置" class="card">
        <t-form labelAlign="top">
          <t-form-item label="快捷指令">
            <div class="quickActions">
              <t-button theme="primary" variant="outline" @click="selectByState('pending')">全选未生成项</t-button>
              <t-button theme="primary" variant="outline" @click="selectByState('done')">全选已生成项</t-button>
              <t-button theme="primary" variant="outline" @click="selectByState('error')">全选错误项</t-button>
              <t-button theme="primary" variant="outline" @click="toggleSelectAll">反选</t-button>
              <t-button theme="primary" variant="outline" @click="clearSelection">取消选择</t-button>
              <t-image-viewer :images="previewImages" :closeOnEscKeydown="true" :closeOnOverlay="true">
                <template #trigger="{ open }">
                  <t-button theme="primary" variant="outline" :disabled="!hasPreviewImages" @click="hasPreviewImages && open()">批预览图片</t-button>
                </template>
              </t-image-viewer>
            </div>
          </t-form-item>
          <t-form-item label="素材类型筛选">
            <t-checkbox-group v-model="checkboxValue" class="filterGroup">
              <t-checkbox label="人物"></t-checkbox>
              <t-checkbox label="场景"></t-checkbox>
              <t-checkbox label="道具"></t-checkbox>
            </t-checkbox-group>
          </t-form-item>
          <t-form-item label="生成模型">
            <t-select
              placeholder="请选择模型"
              :options="[
                { label: '模型1', value: 'model1' },
                { label: '模型2', value: 'model2' },
                { label: '模型3', value: 'model3' },
              ]"></t-select>
          </t-form-item>
          <t-form-item label="分辨率">
            <t-select
              placeholder="请选择分辨率"
              :options="[
                { label: '1K', value: '1k' },
                { label: '2K', value: '2k' },
                { label: '4K', value: '4k' },
              ]"></t-select>
          </t-form-item>
          <t-form-item label="并发数量">
            <t-input-number autoWidth placeholder="请输入并发数"></t-input-number>
          </t-form-item>
          <t-form-item>
            <t-button theme="primary" block>开始批量生成</t-button>
          </t-form-item>
        </t-form>
      </t-card>
    </div>
    <div class="content">
      <t-card v-show="dataList.length > 0" shadow class="card" v-for="item in dataList" :key="item.id" @click.stop="openDrawer(item)">
        <div class="imageBox">
          <t-checkbox class="selectBox" :checked="selectedIds.includes(item.id)" @change="toggleSelect(item.id)" />
          <t-empty v-if="item.state === 'pending'" type="maintenance" title="等待生成" />
          <div v-else-if="item.state === 'generating'" class="generatingBox">
            <t-loading />
            <span class="generatingText">生成中</span>
          </div>
          <t-empty v-else-if="item.state === 'error'" type="fail" title="图片错误" />
          <t-image v-else class="image" :src="item.src" fit="contain" :preview="true" :lazy="true">
            <template #error>
              <t-empty type="fail" title="图片错误" />
            </template>
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="item.src" position="br" />
              </div>
            </template>
          </t-image>
        </div>
        <div class="infoBox">
          <div class="title">{{ item.title }}</div>
          <div class="meta">
            <t-tag size="small" variant="light-outline" theme="warning">{{ item.type }}</t-tag>
            <t-tag size="small" variant="outline" theme="primary" v-show="modelLabel(item.model)" :title="modelLabel(item.model)" class="modelTag">
              {{ modelLabel(item.model) }}
            </t-tag>
            <t-tag size="small" variant="outline">{{ item.resolution?.toUpperCase() || "未设置" }}</t-tag>
          </div>
          <div class="prompts" :title="item.prompts">{{ item.prompts }}</div>
        </div>
      </t-card>
      <t-empty v-if="dataList.length === 0" type="search" title="请先操作剧本" />
      <t-drawer :closeBtn="true" closeOnEscKeydown :showOverlay="false" :footer="false" v-model:visible="drawerVisible" size="480px">
        <template #header>
          <div class="drawerHeader">
            <span>{{ currentItem?.title }} - 单独配置</span>
            <t-tag size="medium" variant="light-outline" theme="warning">{{ currentItem?.type }}</t-tag>
          </div>
        </template>
        <div v-if="currentItem" class="drawerImageBox">
          <t-empty v-if="currentItem.state === 'pending'" type="maintenance" title="等待生成" />
          <div v-else-if="currentItem.state === 'generating'" class="generatingBox">
            <t-loading />
            <span class="generatingText">生成中</span>
          </div>
          <t-empty v-else-if="currentItem.state === 'error'" type="fail" title="图片错误" />
          <t-image v-else-if="currentItem.src" class="image" :src="currentItem.src" fit="contain">
            <template #error>
              <t-empty type="fail" title="图片错误" />
            </template>
            <template #overlayContent>
              <div class="imageToolsWrap show">
                <ImageTools :src="currentItem.src" position="br" />
              </div>
            </template>
          </t-image>
          <t-empty v-else type="maintenance" title="暂无图片" />
        </div>
        <t-form v-if="currentItem" labelAlign="top">
          <t-form-item label="生成模型">
            <t-select v-model="editForm.model" placeholder="请选择模型" :options="modelOptions" />
          </t-form-item>
          <t-form-item label="分辨率">
            <t-select v-model="editForm.resolution" placeholder="请选择分辨率" :options="resolutionOptions" />
          </t-form-item>
          <t-form-item label="提示词">
            <t-textarea v-model="editForm.prompts" placeholder="请输入提示词" :autosize="{ minRows: 4, maxRows: 10 }" :disabled="polishing" />
          </t-form-item>
          <t-form-item>
            <div class="drawerActions">
              <t-button theme="default" variant="outline" :loading="polishing" @click="polishPrompts">
                <template #icon><t-icon name="edit" /></template>
                AI 润色
              </t-button>
              <t-button theme="primary" @click="regenerateItem">
                <template #icon><t-icon name="refresh" /></template>
                重新生成
              </t-button>
            </div>
          </t-form-item>
        </t-form>
      </t-drawer>
    </div>
  </div>
</template>

<script setup>
const checkboxValue = ref([]);

const STATES = ["pending", "generating", "done", "error"];
const TYPE_NAMES = ["人物", "场景", "道具"];
const MODELS = ["model1", "model2", "model3"];
const RESOLUTIONS = ["1k", "2k", "4k"];

const modelOptions = [
  { label: "模型1", value: "model1" },
  { label: "模型2", value: "model2" },
  { label: "模型3", value: "model3" },
];
const resolutionOptions = [
  { label: "1K", value: "1k" },
  { label: "2K", value: "2k" },
  { label: "4K", value: "4k" },
];

const modelLabelMap = Object.fromEntries(modelOptions.map((o) => [o.value, o.label]));
const modelLabel = (val) => modelLabelMap[val] || null;

const dataList = ref(
  Array.from({ length: 40 }, (_, i) => {
    const state = STATES[i % 4];
    const typeName = TYPE_NAMES[i % 3];
    return {
      id: i + 1,
      type: typeName,
      title: `${typeName}-${String(i + 1).padStart(3, "0")}`,
      prompts: `${typeName}描述：示例提示词，用于第 ${i + 1} 张图的生成指引`,
      src: state === "done" ? `https://picsum.photos/seed/${i + 1}/600/360` : null,
      state,
      model: MODELS[i % 3],
      resolution: RESOLUTIONS[i % 3],
    };
  }),
);

const selectedIds = ref([]);

const previewImages = computed(() => {
  const selectedImageList = dataList.value.filter((item) => selectedIds.value.includes(item.id) && item.src).map((item) => item.src);

  if (selectedImageList.length > 0) {
    return selectedImageList;
  }

  return dataList.value.filter((item) => item.src).map((item) => item.src);
});

const hasPreviewImages = computed(() => previewImages.value.length > 0);

const toggleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(idx, 1);
};

const selectByState = (state) => {
  selectedIds.value = dataList.value.filter((item) => item.state === state).map((item) => item.id);
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
const currentItem = ref(null);
const editForm = reactive({
  model: "",
  resolution: "",
  prompts: "",
});

function openDrawer(item) {
  currentItem.value = item;
  editForm.model = item.model || "";
  editForm.resolution = item.resolution || "";
  editForm.prompts = item.prompts || "";
  drawerVisible.value = true;
}

function regenerateItem() {
  if (!currentItem.value) return;
  const item = dataList.value.find((d) => d.id === currentItem.value.id);
  if (!item) return;
  item.model = editForm.model;
  item.resolution = editForm.resolution;
  item.prompts = editForm.prompts;
  item.state = "generating";
  item.src = null;
  window.$message.success("已提交重新生成");
  drawerVisible.value = false;
}

// AI 润色
const polishing = ref(false);
async function polishPrompts() {
  if (!editForm.prompts.trim()) {
    window.$message.warning("请先输入提示词");
    return;
  }
  polishing.value = true;
  try {
    // TODO: 替换为实际 AI 润色 API 调用
    await new Promise((resolve) => setTimeout(resolve, 1500));
    editForm.prompts = `[AI润色] ${editForm.prompts}`;
    window.$message.success("润色完成");
  } catch {
    window.$message.error("润色失败，请重试");
  } finally {
    polishing.value = false;
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
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
    .card {
      cursor: pointer;
      width: 100%;
      height: 100%;
      :deep(.t-card__body) {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .imageBox {
        position: relative;
        width: 100%;
        height: fit-content;
        background-color: #f5f7fa;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        .selectBox {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          z-index: 1;
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
          gap: 0.375rem;
          margin-top: 0.25rem;
          .modelTag {
            max-width: 120px;
            :deep(.t-tag--text) {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
        .prompts {
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
