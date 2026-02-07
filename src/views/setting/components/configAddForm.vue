<template>
  <a-modal v-model:open="open" title="配置视频模型" :footer="null" width="520px" :maskClosable="false" centered class="configModal">
    <a-form :model="localData" :rules="computedRules" ref="formRef" layout="vertical" autocomplete="off" class="configForm">
      <!-- 配置名称 -->
      <a-form-item label="配置名称" name="name">
        <a-input v-model:value="localData.name" placeholder="请输入配置名称，如：默认配置" />
      </a-form-item>

      <!-- 厂商 -->
      <a-form-item label="厂商" name="manufacturer">
        <a-select v-model:value="localData.manufacturer" placeholder="选择AI服务提供商" @change="onManufacturerChange">
          <a-select-option v-for="item in manufacturerList" :disabled="item.disabled" :key="item.value" :value="item.value">
            <div class="manufacturerOption">
              <span>{{ item.label }}</span>
              <a-tag v-if="item.tag" :color="item.tagColor" size="small">{{ item.tag }}</a-tag>
            </div>
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 优先级 -->
      <a-form-item label="优先级" name="index">
        <div class="priorityControl">
          <a-button class="priorityBtn" @click="minusIndex" :disabled="localData.index <= 0">
            <i-minus theme="outline" size="14" fill="currentColor" />
          </a-button>
          <a-input-number v-model:value="localData.index" :min="0" :controls="false" class="priorityInput" />
          <a-button class="priorityBtn" @click="plusIndex">
            <i-plus theme="outline" size="14" fill="currentColor" />
          </a-button>
        </div>
        <div class="formTip">数值越小优先级越高</div>
      </a-form-item>

      <!-- 模型 -->
      <a-form-item v-if="currentConfig.showModel" label="模型" name="model">
        <a-select
          v-if="currentConfig.models?.length"
          v-model:value="localData.model"
          :placeholder="currentConfig.modelPlaceholder"
          show-search
          allow-clear>
          <a-select-option v-for="model in currentConfig.models" :key="model.value" :value="model.value">
            {{ model.label }}
          </a-select-option>
        </a-select>
        <a-input v-else v-model:value="localData.model" :placeholder="currentConfig.modelPlaceholder" />
        <div v-if="currentConfig.modelTip" class="formTip">{{ currentConfig.modelTip }}</div>
      </a-form-item>

      <!-- Base URL -->
      <a-form-item v-if="currentConfig.showBaseUrl" label="Base URL" name="baseUrl">
        <a-input v-model:value="localData.baseUrl" :placeholder="currentConfig.baseUrlPlaceholder" />
        <div v-if="currentConfig.baseUrlTip" class="formTip">{{ currentConfig.baseUrlTip }}</div>
      </a-form-item>

      <!-- API Key -->
      <a-form-item label="API Key" name="apiKey">
        <a-input-password v-model:value="localData.apiKey" :placeholder="currentConfig.apiKeyPlaceholder" />
        <div class="formTip">
          <span>{{ currentConfig.apiKeyTip }}</span>
          <a v-if="currentConfig.apiKeyLink" :href="currentConfig.apiKeyLink" target="_blank" class="tipLink">
            获取API Key
            <i-link-one theme="outline" size="12" fill="currentColor" />
          </a>
        </div>
      </a-form-item>

      <!-- 按钮操作区 -->
      <div class="formActions">
        <a-button size="large" @click="handleCancel">取消</a-button>
        <a-button type="primary" size="large" @click="handleSubmit" :loading="loading">保存配置</a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";

// 厂商配置类型
interface ManufacturerConfig {
  label: string;
  value: string;
  disabled?: boolean;
  tag?: string;
  tagColor?: string;
  showModel: boolean;
  showBaseUrl: boolean;
  models?: { label: string; value: string }[];
  modelPlaceholder?: string;
  modelTip?: string;
  baseUrlPlaceholder?: string;
  baseUrlTip?: string;
  apiKeyPlaceholder: string;
  apiKeyTip: string;
  apiKeyLink?: string;
  defaultBaseUrl?: string;
}

// 厂商配置映射
const manufacturerConfigMap: Record<string, ManufacturerConfig> = {
  volcengine: {
    label: "火山引擎",
    value: "volcengine",
    showModel: true,
    showBaseUrl: true,
    modelPlaceholder: "如: doubao-seedance-1-0-lite-t2v-250428",
    modelTip: "填写火山引擎方舟平台的视频模型 ID",
    baseUrlPlaceholder: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
    baseUrlTip: "请填写完整路径，包括V3后面的Path",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks",
    apiKeyPlaceholder: "请输入火山引擎 API Key，注意不需要 Bearer 前缀",
    apiKeyTip: "在火山引擎控制台创建API Key",
    apiKeyLink: "https://console.volcengine.com/ark",
  },
  apimart: {
    label: "APIMart",
    value: "apimart",
    showModel: true,
    showBaseUrl: false,
    modelPlaceholder: "如: sora-2",
    modelTip: "填写 APIMart 支持的视频模型 ID",
    apiKeyPlaceholder: "请输入 APIMart 的 API Key",
    apiKeyTip: "在 APIMart 控制台获取",
    apiKeyLink: "https://apimart.ai/zh/keys",
  },
  runninghub: {
    label: "RunningHub",
    value: "runninghub",
    showModel: true,
    showBaseUrl: false,
    modelPlaceholder: "如: rhart-video-s",
    modelTip: "填写 RunningHub 的视频模型 ID（可选）",
    apiKeyPlaceholder: "请输入 RunningHub 的密钥，注意不需要 Bearer 前缀",
    apiKeyTip: "在 RunningHub 控制台获取",
    apiKeyLink: "https://runninghub.cn",
  },

  openAi: {
    label: "OpenAI",
    value: "openAi",
    disabled: true,
    tag: "暂不支持",
    tagColor: "default",
    showModel: true,
    showBaseUrl: true,
    modelPlaceholder: "输入模型名称，如：gpt-4",
    modelTip: "OpenAI 目前暂不支持视频生成",
    baseUrlPlaceholder: "https://api.openai.com/v1",
    baseUrlTip: "OpenAI API 服务地址",
    defaultBaseUrl: "https://api.openai.com/v1",
    apiKeyPlaceholder: "sk-xxxx（无需 Bearer 前缀）",
    apiKeyTip: "您的 OpenAI API 密钥",
    apiKeyLink: "https://platform.openai.com/api-keys",
  },
  // custom: {
  //   label: "自定义",
  //   value: "custom",
  //   showModel: true,
  //   showBaseUrl: true,
  //   modelPlaceholder: "输入模型名称",
  //   modelTip: "输入您的模型标识",
  //   baseUrlPlaceholder: "https://api.example.com/v1",
  //   baseUrlTip: "API服务的基础地址",
  //   apiKeyPlaceholder: "请输入 API Key（无需 Bearer 前缀）",
  //   apiKeyTip: "请妥善保管您的 API 密钥",
  // },
};

// 厂商列表
const manufacturerList = computed(() => Object.values(manufacturerConfigMap));

// 当前选中厂商的配置
const currentConfig = computed(() => {
  return manufacturerConfigMap[localData.value.manufacturer] || manufacturerConfigMap.custom;
});

// 动态校验规则
const computedRules = computed(() => {
  const config = currentConfig.value;
  const rules: Record<string, Rule[]> = {
    name: [{ required: true, message: "请输入配置名称", trigger: "blur" }],
    manufacturer: [{ required: true, message: "请选择厂商", trigger: "change" }],
    apiKey: [{ required: true, message: "请输入 API Key", trigger: "blur" }],
  };

  if (config.showModel) {
    rules.model = [{ required: true, message: "请输入或选择模型", trigger: "blur" }];
  }

  if (config.showBaseUrl) {
    rules.baseUrl = [
      { required: true, message: "请输入 Base URL", trigger: "blur" },
      { type: "url", message: "请输入有效的 URL 地址", trigger: "blur" },
    ];
  }

  return rules;
});

interface ConfigForm {
  id: number;
  name: string;
  manufacturer: string;
  index: number;
  model: string;
  baseUrl: string;
  apiKey: string;
  createTime: number;
}

const emits = defineEmits<{
  save: [data: ConfigForm];
}>();

const open = defineModel<boolean>();
const props = defineProps<{ data: ConfigForm }>();

const formRef = ref<FormInstance>();
const loading = ref(false);

const localData = ref<ConfigForm>({
  id: -1,
  name: "",
  manufacturer: "runninghub",
  index: 0,
  model: "",
  baseUrl: "",
  apiKey: "",
  createTime: 0,
});

// 监听弹窗开关
watch(open, (val) => {
  if (val) {
    localData.value = JSON.parse(JSON.stringify(props.data));
  } else {
    formRef.value?.resetFields();
    localData.value = {
      id: -1,
      name: "",
      manufacturer: "runninghub",
      index: 0,
      model: "",
      baseUrl: "",
      apiKey: "",
      createTime: 0,
    };
  }
});

// 厂商切换时重置相关字段并设置默认值
function onManufacturerChange(value: any) {
  const config = manufacturerConfigMap[value];
  if (config) {
    localData.value.model = "";
    localData.value.baseUrl = config.defaultBaseUrl || "";
  }
}

function minusIndex() {
  if (localData.value.index > 0) localData.value.index--;
}

function plusIndex() {
  localData.value.index++;
}

async function handleSubmit() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    loading.value = true;

    // 模拟提交延迟
    await new Promise((resolve) => setTimeout(resolve, 300));

    emits("save", { ...localData.value });
    open.value = false;
  } catch {
    // 校验失败
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  open.value = false;
}
</script>

<style scoped>
.configForm {
  padding: 12px 0;
}

:deep(.ant-form-item) {
  margin-bottom: 24px;
}

:deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

:deep(.ant-form-item-label > label::before) {
  display: none !important;
}

:deep(.ant-form-item-required)::after {
  content: "*";
  color: #ef4444;
  margin-left: 4px;
}

:deep(.ant-input),
:deep(.ant-input-password) {
  height: 44px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 0 16px;
  transition: all 0.2s ease;
}

:deep(.ant-input:hover),
:deep(.ant-input-password:hover) {
  border-color: #d1d5db;
  background: #fff;
}

:deep(.ant-input:focus),
:deep(.ant-input-password:focus),
:deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--mainColor);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.08);
}

:deep(.ant-input-password .ant-input) {
  background: transparent;
  height: auto;
  padding: 0;
  border: none;
  box-shadow: none;
}

:deep(.ant-select-selector) {
  height: 44px !important;
  border-radius: 10px !important;
  border: 1px solid #e5e7eb !important;
  background: #f9fafb !important;
  padding: 0 16px !important;
  transition: all 0.2s ease !important;
}

:deep(.ant-select-selection-item),
:deep(.ant-select-selection-placeholder) {
  line-height: 42px !important;
}

:deep(.ant-select:hover .ant-select-selector) {
  border-color: #d1d5db !important;
  background: #fff !important;
}

:deep(.ant-select-focused .ant-select-selector) {
  border-color: var(--mainColor) !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.08) !important;
}

.manufacturerOption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.manufacturerOption :deep(.ant-tag) {
  margin: 0;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 4px;
}

.priorityControl {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priorityBtn {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.priorityBtn:hover:not(:disabled) {
  border-color: var(--mainColor);
  color: var(--mainColor);
  background: rgba(152, 16, 250, 0.04);
}

.priorityBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.priorityInput {
  width: 80px;
  text-align: center;
}

:deep(.priorityInput) {
  height: 44px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

:deep(.priorityInput .ant-input-number-input) {
  height: 42px;
  text-align: center;
  font-weight: 600;
  font-size: 16px;
}

:deep(.priorityInput:hover) {
  border-color: #d1d5db;
}

:deep(.priorityInput:focus),
:deep(.priorityInput-focused) {
  border-color: var(--mainColor);
  box-shadow: 0 0 0 3px rgba(152, 16, 250, 0.08);
}

.formTip {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tipLink {
  color: var(--mainColor);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.tipLink:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.formActions .ant-btn {
  height: 44px;
  padding: 0 28px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
}

.formActions .ant-btn:first-child {
  border: 1px solid #e5e7eb;
  background: #fff;
}

.formActions .ant-btn:first-child:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

:deep(.ant-btn-primary) {
  background: var(--mainGradient);
  border: none;
  box-shadow: 0 2px 8px rgba(152, 16, 250, 0.25);
}

:deep(.ant-btn-primary:hover) {
  background: var(--mainGradientHover);
  box-shadow: 0 4px 12px rgba(152, 16, 250, 0.35);
}

:deep(.ant-btn-primary:active) {
  box-shadow: 0 1px 4px rgba(152, 16, 250, 0.2);
}

/* 表单错误状态 */
:deep(.ant-form-item-has-error .ant-input),
:deep(.ant-form-item-has-error .ant-input-password),
:deep(.ant-form-item-has-error .ant-select-selector) {
  border-color: #ef4444 !important;
}

:deep(.ant-form-item-has-error .ant-input:focus),
:deep(.ant-form-item-has-error .ant-input-password:focus),
:deep(.ant-form-item-has-error .ant-select-focused .ant-select-selector) {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08) !important;
}

/* 下拉框样式 */
:deep(.ant-select-dropdown) {
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 4px;
}

:deep(.ant-select-item) {
  border-radius: 6px;
  padding: 8px 12px;
}

:deep(.ant-select-item-option-selected) {
  background: rgba(152, 16, 250, 0.08);
  color: var(--mainColor);
  font-weight: 500;
}

:deep(.ant-select-item-option-active) {
  background: #f3f4f6;
}
</style>
