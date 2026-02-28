<template>
  <el-dialog v-model="modelShow" :title="props.state" top="1vh" :footer="null" width="70vw">
    <div class="addModelContainer">
      <div class="model-cards-container">
        <a-tabs v-model:activeKey="activeTab" class="model-tabs">
          <a-tab-pane v-for="tab in useTabList" :key="tab.key" :tab="tab.tab">
            <div class="filter-section">
              <div class="search-wrapper">
                <a-input-search v-model:value="searchKeyword" placeholder="搜索模型名称或描述..." allow-clear size="large" class="search-input">
                  <template #prefix>
                    <SearchOutlined />
                  </template>
                </a-input-search>
              </div>

              <div class="manufacturer-filter">
                <div class="filter-header">
                  <span class="filter-label">
                    <FilterOutlined />
                    厂商筛选
                  </span>
                  <a-button v-if="selectedManufacturers.length > 0" type="link" size="small" @click="clearFilters">清空筛选</a-button>
                </div>
                <div class="manufacturer-tags">
                  <a-checkable-tag
                    v-for="manufacturer in availableManufacturers"
                    :key="manufacturer.key"
                    :checked="selectedManufacturers.includes(manufacturer.key)"
                    @change="toggleManufacturer(manufacturer.key)"
                    class="manufacturer-tag">
                    <a-badge :color="getManufacturerColor(manufacturer.key)" />
                    {{ manufacturer.name }}
                  </a-checkable-tag>
                </div>
              </div>

              <div class="filter-result" v-if="searchKeyword || selectedManufacturers.length > 0">
                <span class="result-text">
                  找到
                  <strong>{{ getFilteredModels(tab.key).length }}</strong>
                  个模型
                </span>
              </div>
            </div>

            <a-divider style="margin: 16px 0" />

            <div class="cards-grid">
              <a-empty v-if="getFilteredModels(tab.key).length === 0" description="未找到匹配的模型" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
              <template v-else>
                <div
                  v-for="model in getFilteredModels(tab.key)"
                  :key="`${model.manufacturer}-${model.modelType}-${model.model}`"
                  class="model-card"
                  @click="selectModel(model)">
                  <div class="card-icon">
                    <component :is="tab.icon" fill="#9810fa" />
                  </div>
                  <div class="card-header">
                    <h3 :title="model.modelName">{{ model.modelName }}</h3>
                    <a-tag :color="getManufacturerColor(model.manufacturer)">{{ model.manufacturerName }}</a-tag>
                  </div>
                </div>
                <!-- 自定义卡片 -->
                <div class="model-card custom-card" @click="selectCustomModel(tab.customType)">
                  <div class="card-icon">
                    <PlusOutlined />
                  </div>
                  <div class="card-header">
                    <h3>自定义模型</h3>
                  </div>
                  <div class="card-body">
                    <p class="model-description">{{ tab.customDesc }}</p>
                  </div>
                </div>
              </template>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
    <addModelDialog
      v-model="showConfigModal"
      v-if="showConfigModal"
      v-model:modelForm="modelForm"
      :currentWebsite="currentWebsite"
      :isCustomModel="isCustomModel"
      :defaultPlaceHolder="getDefaultBaseUrlPlaceholder"
      :manufacturerNames="manufacturerNames"
      @fetchModelList="sure" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { message, Empty } from "ant-design-vue";
import { SearchOutlined, FilterOutlined, PlusOutlined } from "@ant-design/icons-vue";
import addModelDialog from "./addModelDialog.vue";

const props = defineProps({
  state: {
    type: String,
  },
  typeList: {
    type: Array,
    default: () => [],
  },
});
// 当前激活的标签页
const activeTab = ref<string>("text");
// 是否显示配置弹窗
const showConfigModal = ref<boolean>(false);
// 是否是自定义模型
const isCustomModel = ref<boolean>(false);
// 搜索关键词
const searchKeyword = ref<string>("");
// 选中的厂商列表
const selectedManufacturers = ref<string[]>([]);
// tab 列表配置，用于统一渲染三个类型的页签
const tabList = [
  { key: "text", tab: "文本", icon: "i-text", customDesc: "使用自定义文本模型", customType: "text" },
  { key: "image", tab: "图像", icon: "i-picture", customDesc: "使用自定义图像模型", customType: "image" },
  { key: "video", tab: "视频", icon: "i-video", customDesc: "使用自定义视频模型", customType: "video" },
];
const useTabList = computed(() => {
  if (!props.typeList.length) {
    activeTab.value = "text";
    return tabList;
  }
  const resKey = tabList.filter((tab) => props.typeList.includes(tab.key));
  activeTab.value = resKey.length > 0 ? resKey[0].key : "";
  return resKey;
});
const websites = ref<Record<string, string>>({
  deepSeek: "https://platform.deepseek.com",
  volcengine: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
  kling: "https://app.klingai.com/cn/dev/api-key",
  zhipu: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
  qwen: "https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key",
  wan: "https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key",
  openai: "",
  vidu: "https://platform.vidu.cn/api-keys",
  anthropic: "",
  runninghub: "https://www.runninghub.cn/enterprise-api/consumerApi",
  gemini: "https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn",
});

const currentWebsite = computed(() => {
  return websites.value[modelForm.value.manufacturer] || "";
});

// 厂商名称映射
const manufacturerNames: Record<string, string> = {
  deepSeek: "DeepSeek",
  volcengine: "火山引擎",
  kling: "可灵",
  zhipu: "智谱",
  qwen: "阿里千问",
  wan: "阿里万相",
  openai: "OpenAI",
  vidu: "Vidu",
  anthropic: "Anthropic",
  runninghub: "RunningHUB",
  gemini: "Gemini",
  other: "其他",
};

// 获取厂商颜色
function getManufacturerColor(manufacturer: string): string {
  const colors: Record<string, string> = {
    deepSeek: "blue",
    volcengine: "orange",
    kling: "purple",
    zhipu: "cyan",
    qwen: "green",
    wan: "green",
    openai: "geekblue",
    vidu: "magenta",
    anthropic: "volcano",
    runninghub: "gold",
    gemini: "lime",
    other: "default",
  };
  return colors[manufacturer] || "default";
}

// 厂商默认 BaseURL 配置
const manufacturerDefaultBaseUrls: Record<string, Record<string, string>> = {
  deepSeek: {
    text: "https://api.deepseek.com/v1",
    image: "",
    video: "",
  },
  volcengine: {
    text: "https://ark.cn-beijing.volces.com/api/v3",
    image: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
    video: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
  },
  kling: {
    text: "https://api.klingai.com",
    image: "https://api-beijing.klingai.com/v1/images/omni-image",
    video:
      "https://api-beijing.klingai.com/v1/videos/image2video|https://api-beijing.klingai.com/v1/videos/text2video|https://api-beijing.klingai.com/v1/videos/text2video/{taskId}",
  },
  zhipu: {
    text: "https://open.bigmodel.cn/api/paas/v4",
    image: "",
    video: "",
  },
  qwen: {
    text: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    image: "",
    video: "",
  },
  wan: {
    text: "",
    image: "",
    video:
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis|https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis|https://dashscope.aliyuncs.com/api/v1/tasks/{taskId}",
  },
  openai: {
    text: "https://api.openai.com/v1",
    image: "",
    video: "",
  },
  vidu: {
    text: "",
    image: "https://api.vidu.cn/ent/v2/reference2image|https://api.vidu.cn/ent/v2/tasks/{id}/creations",
    video: "https://api.vidu.cn/ent/v2/text2video|https://api.vidu.cn/ent/v2/img2video|https://api.vidu.cn/ent/v2/tasks",
  },
  gemini: {
    text: "https://generativelanguage.googleapis.com/v1beta",
    image: "https://generativelanguage.googleapis.com/v1beta",
    video:
      "https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning|https://generativelanguage.googleapis.com/v1beta/{name}",
  },
  anthropic: {
    text: "https://api.anthropic.com/v1",
    image: "",
    video: "",
  },
  runninghub: {
    text: "",
    image: "",
    video: "",
  },
  other: {
    text: "",
    image: "",
    video: "",
  },
};

interface ModelCard {
  manufacturer: string;
  manufacturerName: string;
  modelType: string;
  model: string;
  modelName: string;
  description: string;
  baseUrl: string;
}

const modelShow = defineModel<boolean>("modelShow", {
  type: Boolean,
  required: true,
});
const modelForm = ref<RowData>({
  id: 0,
  name: "",
  type: "",
  modelType: "",
  model: "",
  baseUrl: "",
  manufacturer: "",
  createTime: 0,
  apiKey: "",
});

interface RowData {
  id: number;
  name: string;
  type: string;
  modelType: string;
  model: string;
  baseUrl: string;
  manufacturer: string;
  createTime: number;
  apiKey: string;
}

//文本模型预设
const textModelPresets = {
  deepSeek: [
    { label: "deepseek-chat", value: "deepseek-chat" },
    { label: "deepseek-reasoner", value: "deepseek-reasoner" },
  ],
  volcengine: [
    { label: "doubao-lite-4-chat", value: "doubao-lite-4-chat" },
    { label: "doubao-pro-4-chat", value: "doubao-pro-4-chat" },
    { label: "doubao-seed-1-8-251228", value: "doubao-seed-1-8-251228" },
    { label: "doubao-seed-1-6-251015", value: "doubao-seed-1-6-251015" },
  ],
  zhipu: [
    { label: "glm-4.7", value: "glm-4.7" },
    { label: "glm-4.7-flashx", value: "glm-4.7-flashx" },
    { label: "glm-4.6", value: "glm-4.6" },
    { label: "glm-4.5-air", value: "glm-4.5-air" },
    { label: "glm-4.5-airx", value: "glm-4.5-airx" },
    { label: "glm-4-long", value: "glm-4-long" },
    { label: "glm-4.7-flash", value: "glm-4.7-flash" },
    { label: "glm-4.5-flash", value: "glm-4.5-flash" },
    { label: "glm-4.6v", value: "glm-4.6v" },
  ],
  qwen: [
    { label: "qwen-vl-max", value: "qwen-vl-max" },
    { label: "qwen-plus-latest", value: "qwen-plus-latest" },
    { label: "qwen-max", value: "qwen-max" },
    { label: "qwen2.5-72b-instruct", value: "qwen2.5-72b-instruct" },
    { label: "qwen2.5-14b-instruct-1m", value: "qwen2.5-14b-instruct-1m" },
    { label: "qwen2.5-vl-72b-instruct", value: "qwen2.5-vl-72b-instruct" },
  ],
  openai: [
    { label: "gpt-4o", value: "gpt-4o" },
    { label: "gpt-4o-mini", value: "gpt-4o-mini" },
    { label: "gpt-4.1", value: "gpt-4.1" },
    { label: "gpt-5.1", value: "gpt-5.1" },
    { label: "gpt-5.2", value: "gpt-5.2" },
  ],
  gemini: [
    { label: "gemini-2.0-flash", value: "gemini-2.0-flash" },
    { label: "gemini-2.0-flash-lite", value: "gemini-2.0-flash-lite" },
    { label: "gemini-1.5-pro", value: "gemini-1.5-pro" },
    { label: "gemini-1.5-flash", value: "gemini-1.5-flash" },
    { label: "gemini-2.5-pro", value: "gemini-2.5-pro" },
    { label: "gemini-2.5-flash", value: "gemini-2.5-flash" },
  ],
  anthropic: [
    { label: "claude-opus-4-5", value: "claude-opus-4-5" },
    { label: "claude-haiku-4-5", value: "claude-haiku-4-5" },
    { label: "claude-sonnet-4-5", value: "claude-sonnet-4-5" },
    { label: "claude-opus-4-1", value: "claude-opus-4-1" },
    { label: "claude-opus-4-0", value: "claude-opus-4-0" },
    { label: "claude-sonnet-4-0", value: "claude-sonnet-4-0" },
    { label: "claude-3-7-sonnet-latest", value: "claude-3-7-sonnet-latest" },
    { label: "claude-3-5-haiku-latest", value: "claude-3-5-haiku-latest" },
  ],
};

// 生成文本模型卡片列表
const textModels = computed<ModelCard[]>(() => {
  const models: ModelCard[] = [];
  Object.entries(textModelPresets).forEach(([manufacturer, presets]) => {
    presets.forEach((preset) => {
      models.push({
        manufacturer,
        manufacturerName: manufacturerNames[manufacturer],
        modelType: "text",
        model: preset.value,
        modelName: preset.label,
        description: `${manufacturerNames[manufacturer]}文本模型`,
        baseUrl: manufacturerDefaultBaseUrls[manufacturer]?.text || "",
      });
    });
  });
  return models;
});

// 获取可用的厂商列表（根据当前标签页）
const availableManufacturers = computed(() => {
  const manufacturers = new Set<string>();

  let currentModels: ModelCard[] = [];
  if (activeTab.value === "text") {
    currentModels = textModels.value;
  } else if (activeTab.value === "image") {
    currentModels = imageModels.value;
  } else if (activeTab.value === "video") {
    currentModels = videoModels.value;
  }

  currentModels.forEach((model) => {
    manufacturers.add(model.manufacturer);
  });

  return Array.from(manufacturers)
    .map((key) => ({
      key,
      name: manufacturerNames[key] || key,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
});

// 筛选模型的通用函数
function filterModels(models: ModelCard[]): ModelCard[] {
  let filtered = models;

  // 厂商筛选
  if (selectedManufacturers.value.length > 0) {
    filtered = filtered.filter((model) => selectedManufacturers.value.includes(model.manufacturer));
  }

  // 搜索关键词筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim();
    filtered = filtered.filter(
      (model) =>
        model?.modelName.toLowerCase().includes(keyword) ||
        model?.description.toLowerCase().includes(keyword) ||
        model?.manufacturerName.toLowerCase().includes(keyword),
    );
  }

  return filtered;
}

// 筛选后的文本模型
const filteredTextModels = computed<ModelCard[]>(() => {
  return filterModels(textModels.value);
});

// 切换厂商选择
function toggleManufacturer(manufacturer: string) {
  const index = selectedManufacturers.value.indexOf(manufacturer);
  if (index > -1) {
    selectedManufacturers.value.splice(index, 1);
  } else {
    selectedManufacturers.value.push(manufacturer);
  }
}

// 清空筛选条件
function clearFilters() {
  selectedManufacturers.value = [];
  searchKeyword.value = "";
}

// 监听标签页切换，清空筛选条件
watch(activeTab, () => {
  clearFilters();
});
//图片模型预设
const imageModelPresets = {
  volcengine: [{ label: "doubao-seedream-4-5-251128", value: "doubao-seedream-4-5-251128" }],
  kling: [
    { label: "kling-v1", value: "kling-v1" },
    { label: "kling-v1-5", value: "kling-v1-5" },
    { label: "kling-v2", value: "kling-v2" },
    { label: "kling-v2-new", value: "kling-v2-new" },
    { label: "kling-v2-1", value: "kling-v2-1" },
  ],
  gemini: [
    { label: "gemini-2.5-flash-image", value: "gemini-2.5-flash-image" },
    { label: "gemini-3-pro-image-preview", value: "gemini-3-pro-image-preview" },
  ],
  vidu: [{ label: "viduq2", value: "viduq2" }],
  runninghub: [{ label: "nanobanana", value: "nanobanana" }],
  // apimart: [
  //   { label: "nanobanana", value: "nanobanana" },
  // ],
};

// 生成图像模型卡片列表
const imageModels = computed<ModelCard[]>(() => {
  const models: ModelCard[] = [];
  Object.entries(imageModelPresets).forEach(([manufacturer, presets]) => {
    presets.forEach((preset) => {
      models.push({
        manufacturer,
        manufacturerName: manufacturerNames[manufacturer],
        modelType: "image",
        model: preset.value,
        modelName: preset.label,
        description: `${manufacturerNames[manufacturer]}图像模型`,
        baseUrl: manufacturerDefaultBaseUrls[manufacturer]?.image || "",
      });
    });
  });
  return models;
});

// 筛选后的图像模型
const filteredImageModels = computed<ModelCard[]>(() => {
  return filterModels(imageModels.value);
});
//视频模型预设
const videoModelPresets = {
  volcengine: [
    { label: "doubao-seedance-1-0-pro-fast-251015", value: "doubao-seedance-1-0-pro-fast-251015" },
    { label: "doubao-seedance-1-5-pro-251215", value: "doubao-seedance-1-5-pro-251215" },
    { label: "doubao-seedance-1-0-pro-250528", value: "doubao-seedance-1-0-pro-250528" },
    { label: "doubao-seedance-1-0-lite-i2v-250428", value: "doubao-seedance-1-0-lite-i2v-250428" },
    { label: "doubao-seedance-1-0-lite-t2v-250428", value: "doubao-seedance-1-0-lite-t2v-250428" },
  ],
  runninghub: [
    { label: "sora-2", value: "sora-2" },
    { label: "sora-2-pro", value: "sora-2-pro" },
  ],
  kling: [
    { label: "kling-v1(STD)", value: "kling-v1(STD)" },
    { label: "kling-v1(PRO)", value: "kling-v1(PRO)" },
    { label: "kling-v1-6(PRO)", value: "kling-v1-6(PRO)" },
  ],
  gemini: [
    { label: "veo-3.1-generate-preview", value: "veo-3.1-generate-preview" },
    { label: "veo-3.1-fast-generate-preview", value: "veo-3.1-fast-generate-preview" },
    { label: "veo-3.0-generate-preview", value: "veo-3.0-generate-preview" },
    { label: "veo-3.0-fast-generate-preview", value: "veo-3.0-fast-generate-preview" },
    { label: "veo-2.0-generate-001", value: "veo-2.0-generate-001" },
  ],
  wan: [
    { label: "wan2.6-i2v-flash", value: "wan2.6-i2v-flash" },
    { label: "wan2.6-i2v", value: "wan2.6-i2v" },
    { label: "wan2.5-i2v-preview", value: "wan2.5-i2v-preview" },
    { label: "wan2.2-i2v-flash", value: "wan2.2-i2v-flash" },
    { label: "wan2.2-i2v-plus", value: "wan2.2-i2v-plus" },
    { label: "wanx2.1-i2v-plus", value: "wanx2.1-i2v-plus" },
    { label: "wanx2.1-i2v-turbo", value: "wanx2.1-i2v-turbo" },
    { label: "wanx2.1-kf2v-plus", value: "wanx2.1-kf2v-plus" },
    { label: "wan2.2-kf2v-flash", value: "wan2.2-kf2v-flash" },
    { label: "wan2.6-t2v", value: "wan2.6-t2v" },
    { label: "wan2.5-t2v-preview", value: "wan2.5-t2v-preview" },
    { label: "wan2.2-t2v-plus", value: "wan2.2-t2v-plus" },
    { label: "wanx2.1-t2v-turbo", value: "wanx2.1-t2v-turbo" },
    { label: "wanx2.1-t2v-plus", value: "wanx2.1-t2v-plus" },
  ],
  vidu: [
    { label: "viduq3-pro", value: "viduq3-pro" },
    { label: "viduq2-pro-fast", value: "viduq2-pro-fast" },
    { label: "viduq2-pro", value: "viduq2-pro" },
    { label: "viduq2-turbo", value: "viduq2-turbo" },
    { label: "viduq1", value: "viduq1" },
    { label: "viduq1-classic", value: "viduq1-classic" },
    { label: "vidu2.0", value: "vidu2.0" },
  ],
};

// 生成视频模型卡片列表
const videoModels = computed<ModelCard[]>(() => {
  const models: ModelCard[] = [];
  Object.entries(videoModelPresets).forEach(([manufacturer, presets]) => {
    presets.forEach((preset) => {
      models.push({
        manufacturer,
        manufacturerName: manufacturerNames[manufacturer],
        modelType: "video",
        model: preset.value,
        modelName: preset.label,
        description: `${manufacturerNames[manufacturer]}视频模型`,
        baseUrl: manufacturerDefaultBaseUrls[manufacturer]?.video || "",
      });
    });
  });
  return models;
});

// 筛选后的视频模型
const filteredVideoModels = computed<ModelCard[]>(() => {
  return filterModels(videoModels.value);
});

function getFilteredModels(key: string): ModelCard[] {
  if (key === "text") return filteredTextModels.value;
  if (key === "image") return filteredImageModels.value;
  return filteredVideoModels.value;
}

// 选择模型卡片
function selectModel(model: ModelCard) {
  isCustomModel.value = false;
  modelForm.value = {
    id: 0,
    name: "",
    type: getModelTypeCategory(model.modelType),
    modelType: model.modelType,
    model: model.model,
    baseUrl: model.baseUrl,
    manufacturer: model.manufacturer,
    createTime: 0,
    apiKey: "",
  };
  showConfigModal.value = true;
}

// 选择自定义模型
function selectCustomModel(type: string) {
  isCustomModel.value = true;
  modelForm.value = {
    id: 0,
    name: "",
    type: type,
    modelType: "",
    model: "",
    baseUrl: "",
    manufacturer: "other",
    createTime: 0,
    apiKey: "",
  };
  showConfigModal.value = true;
}

// 获取当前模型类型对应的大类（text/image/video）
function getModelTypeCategory(modelType: string): string {
  return modelType;
}

// 获取默认 BaseURL 的 placeholder
const getDefaultBaseUrlPlaceholder = computed((): string => {
  const { manufacturer, type } = modelForm.value;
  if (!manufacturer || manufacturer === "runninghub") {
    return "请输入 Base URL";
  }

  if (type && manufacturerDefaultBaseUrls[manufacturer]) {
    const defaultUrl = manufacturerDefaultBaseUrls[manufacturer][type];
    return defaultUrl ? `默认: ${defaultUrl}` : "请输入 Base URL";
  }

  return "请输入 Base URL";
});

const emit = defineEmits(["fetchModelList"]);

function sure() {
  emit("fetchModelList");
  modelShow.value = false;
}
</script>

<style lang="scss" scoped>
.addModelContainer {
  width: 100%;
  height: 80vh;
  overflow: auto;
}

.model-cards-container {
  padding: 20px;
}

.model-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 24px;
  }
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 10px 0;
}

.model-card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  &:hover {
    border-color: #d9d9d9;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
  }

  .card-icon {
    font-size: 24px;
    color: #1890ff;
    transition: all 0.25s ease;
    &:deep(.anticon) {
      display: block;
    }
  }

  &:hover .card-icon {
    color: #40a9ff;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 8px;
    gap: 8px;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #262626;
      overflow: hidden;
      flex: 1;
    }

    :deep(.ant-tag) {
      border-radius: 4px;
      border: 0;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      flex-shrink: 0;
    }
  }

  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .model-description {
      color: #8c8c8c;
      font-size: 13px;
      line-height: 1.5;
    }

    .model-type {
      font-size: 12px;
      color: #8c8c8c;

      .type-label {
        font-weight: 500;
        margin-right: 4px;
      }
    }
  }
}

.custom-card {
  border: 1px dashed #d9d9d9;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;

  &:hover {
    border-color: #1890ff;
    background: #f5f9ff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

    .card-icon {
      color: #40a9ff;
    }

    .card-header h3 {
      color: #1890ff;
    }
  }

  .card-icon {
    color: #1890ff;
    font-size: 36px;
    margin-bottom: 8px;
    transition: all 0.25s ease;
  }

  .card-header h3 {
    color: #1890ff;
    font-weight: 600;
    transition: color 0.25s ease;
  }

  .card-body .model-description {
    color: #8c8c8c;
    text-align: center;
    font-size: 13px;
  }
}

// 筛选和搜索区域样式
.filter-section {
  margin-bottom: 20px;
}

.search-wrapper {
  margin-bottom: 16px;

  .search-input {
    max-width: 500px;

    :deep(.ant-input-affix-wrapper) {
      border-radius: 6px;
      border: 1px solid #f0f0f0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: all 0.25s ease;

      &:hover {
        border-color: #d9d9d9;
      }

      &:focus-within {
        border-color: #1890ff;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.12);
      }
    }

    :deep(.ant-input) {
      font-size: 14px;
    }
  }
}

.manufacturer-filter {
  background: #fafafa;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #f0f0f0;

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .filter-label {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
      display: flex;
      align-items: center;
      gap: 6px;

      :deep(.anticon) {
        color: #1890ff;
      }
    }
  }

  .manufacturer-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .manufacturer-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 14px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.25s ease;
      border: 1px solid #d9d9d9;
      background: #fff;
      user-select: none;

      &:hover {
        border-color: #1890ff;
        color: #1890ff;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(24, 144, 255, 0.12);
      }

      &.ant-tag-checkable-checked {
        background: #1890ff;
        border-color: #1890ff;
        color: #fff;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.25);

        &:hover {
          background: #40a9ff;
          border-color: #40a9ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3);
        }
      }

      :deep(.ant-badge-status-dot) {
        width: 8px;
        height: 8px;
      }
    }
  }
}

.filter-result {
  margin-top: 12px;
  padding: 8px 12px;
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
  border-radius: 4px;

  .result-text {
    font-size: 13px;
    color: #0050b3;

    strong {
      font-weight: 600;
      color: #1890ff;
      font-size: 14px;
    }
  }
}

// 空状态样式优化
:deep(.ant-empty) {
  margin: 60px 0;

  .ant-empty-description {
    color: #8c8c8c;
    font-size: 14px;
  }
}
</style>
