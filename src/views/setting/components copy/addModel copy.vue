<template>
  <div class="addModelContainer">
    <a-modal v-model:open="modelShow" :title="props.state" :footer="null" width="520px">
      <a-form :model="modelForm">
        <a-form-item label="厂商">
          <a-select placeholder="请选择厂商" v-model:value="modelForm.manufacturer" style="width: 100%">
            <a-select-option value="deepSeek">DeepSeek</a-select-option>
            <a-select-option value="volcengine">火山引擎</a-select-option>
            <a-select-option value="kling">可灵</a-select-option>
            <a-select-option value="zhipu">智谱</a-select-option>
            <a-select-option value="qwen">阿里（千问）</a-select-option>
            <a-select-option value="wan">阿里（万相）</a-select-option>
            <a-select-option value="openai">OpenAI</a-select-option>
            <a-select-option value="vidu">Vidu</a-select-option>
            <a-select-option value="anthropic">Anthropic</a-select-option>
            <a-select-option value="runninghub">RunningHUB</a-select-option>
            <a-select-option value="gemini">Gemini</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
          <a :href="website" target="_blank" rel="noopener noreferrer" style="font-size: 12px" v-if="website">点击获取厂商API</a>
        </a-form-item>
        <a-form-item label="类型">
          <a-select
            placeholder="请选择类型"
            ref="select"
            style="width: 100%"
            :allowClear="true"
            :options="typeOptions"
            :field-names="{ label: 'name', value: 'value', options: 'children' }"
            v-model:value="modelForm.modelType" />
        </a-form-item>

        <a-form-item label="模型">
          <a-select
            v-if="modelForm.manufacturer !== 'other'"
            placeholder="请选择模型"
            ref="select"
            style="width: 100%"
            :allowClear="true"
            :options="currentModelPresets"
            :field-names="{ label: 'label', value: 'value' }"
            v-model:value="modelForm.model" />
          <a-input v-else v-model:value="modelForm.model" placeholder="请输入自定义模型标识" />
        </a-form-item>
        <a-form-item label="Base URL" v-if="modelForm.manufacturer !== 'runninghub'">
          <a-input v-model:value="modelForm.baseUrl" :placeholder="getDefaultBaseUrlPlaceholder()" />
        </a-form-item>
        <a-form-item label="API Key">
          <a-input v-model:value="modelForm.apiKey" />
        </a-form-item>
        <a-form-item style="text-align: right; margin-bottom: 0">
          <a-button style="margin-right: 8px" @click="modelShow = false">取消</a-button>
          <a-button type="primary" @click="keep">保存</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import axios from "@/utils/axios";
import { message } from "ant-design-vue";
import type { SelectProps } from "ant-design-vue";
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
const website = computed(() => {
  return websites.value[modelForm.value.manufacturer] || "";
});

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

const modelShow = defineModel<boolean>("modelShow", {
  type: Boolean,
  required: true,
});
const modelForm = defineModel<RowData>("modelForm", {
  type: Object,
  required: true,
});
const props = defineProps({
  state: {
    type: String,
  },
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
//所有模型类型选项
const allTypeOptions: SelectProps["options"] = [
  {
    name: "文本模型",
    children: [
      {
        value: "usuallyText",
        name: "普通",
      },
      {
        value: "deepThinkingText",
        name: "深度思考",
      },
    ],
  },
  {
    name: "图片模型",
    children: [
      {
        value: "i2i",
        name: "图生图",
      },
      {
        value: "t2i",
        name: "文生图",
      },
    ],
  },
  {
    name: "视频模型",
    children: [
      {
        value: "singleImage",
        name: "单图生视频",
      },
      {
        value: "startEndRequired",
        name: "首尾帧（两张都得有）",
      },
      {
        value: "endFrameOptional",
        name: "首尾帧（尾帧可选）",
      },
      {
        value: "startFrameOptional",
        name: "首尾帧（首帧可选）",
      },
      {
        value: "multiImage",
        name: "多图生视频",
      },
      {
        value: "reference",
        name: "参考图生视频",
      },
      {
        value: "text",
        name: "文本生视频",
      },
    ],
  },
];

// 根据厂商动态计算可用的模型类型
const typeOptions = computed<SelectProps["options"]>(() => {
  const { manufacturer } = modelForm.value;

  if (!manufacturer || manufacturer === "other") {
    return allTypeOptions;
  }

  // 获取该厂商支持的所有模型类型
  const supportedTypes = new Set<string>();

  // 检查文本模型
  if (textModelPresets[manufacturer as keyof typeof textModelPresets]) {
    const textPresets = textModelPresets[manufacturer as keyof typeof textModelPresets];
    Object.keys(textPresets).forEach((type) => {
      if (textPresets[type as keyof typeof textPresets]?.length > 0) {
        supportedTypes.add(type);
      }
    });
  }

  // 检查图片模型
  if (imageModelPresets[manufacturer as keyof typeof imageModelPresets]) {
    const imagePresets = imageModelPresets[manufacturer as keyof typeof imageModelPresets];
    Object.keys(imagePresets).forEach((type) => {
      if (imagePresets[type as keyof typeof imagePresets]?.length > 0) {
        supportedTypes.add(type);
      }
    });
  }

  // 检查视频模型
  if (videoModelPresets[manufacturer as keyof typeof videoModelPresets]) {
    const videoPresets = videoModelPresets[manufacturer as keyof typeof videoModelPresets];
    Object.keys(videoPresets).forEach((type) => {
      if (videoPresets[type as keyof typeof videoPresets]?.length > 0) {
        supportedTypes.add(type);
      }
    });
  }

  // 过滤出该厂商支持的类型
  return allTypeOptions
    .map((category) => ({
      ...category,
      children: category.children?.filter((child) => supportedTypes.has(child.value as string)),
    }))
    .filter((category) => category.children && category.children.length > 0);
});
//文本模型预设
const textModelPresets = {
  deepSeek: {
    usuallyText: [{ label: "deepseek-chat", value: "deepseek-chat" }],
    deepThinkingText: [{ label: "deepseek-reasoner", value: "deepseek-reasoner" }],
  },
  volcengine: {
    usuallyText: [
      { label: "doubao-lite-4-chat", value: "doubao-lite-4-chat" },
      { label: "doubao-pro-4-chat", value: "doubao-pro-4-chat" },
    ],
    deepThinkingText: [
      { label: "doubao-seed-1-8-251228", value: "doubao-seed-1-8-251228" },
      { label: "doubao-seed-1-6-251015", value: "doubao-seed-1-6-251015" },
      { label: "doubao-seed-1-6-lite-251015", value: "doubao-seed-1-6-lite-251015" },
      { label: "doubao-seed-1-6-flash-250828", value: "doubao-seed-1-6-flash-250828" },
    ],
  },
  zhipu: {
    usuallyText: [
      { label: "glm-4.7", value: "glm-4.7" },
      { label: "glm-4.7-flashx", value: "glm-4.7-flashx" },
      { label: "glm-4.6", value: "glm-4.6" },
      { label: "glm-4.5-air", value: "glm-4.5-air" },
      { label: "glm-4.5-airx", value: "glm-4.5-airx" },
      { label: "glm-4-long", value: "glm-4-long" },
      { label: "glm-4-flashx-250414", value: "glm-4-flashx-250414" },
      { label: "glm-4.7-flash", value: "glm-4.7-flash" },
      { label: "glm-4-flash-250414", value: "glm-4-flash-250414" },
    ],
    deepThinkingText: [
      { label: "glm-4.5-flash", value: "glm-4.5-flash" },
      { label: "glm-4.6v", value: "glm-4.6v" },
    ],
  },
  qwen: {
    usuallyText: [
      { label: "qwen-vl-max", value: "qwen-vl-max" },
      { label: "qwen-plus-latest", value: "qwen-plus-latest" },
      { label: "qwen-max", value: "qwen-max" },
      { label: "qwen2.5-72b-instruct", value: "qwen2.5-72b-instruct" },
      { label: "qwen2.5-14b-instruct-1m", value: "qwen2.5-14b-instruct-1m" },
      { label: "qwen2.5-vl-72b-instruct", value: "qwen2.5-vl-72b-instruct" },
    ],
    deepThinkingText: [],
  },
  openai: {
    usuallyText: [
      { label: "gpt-4o", value: "gpt-4o" },
      { label: "gpt-4o-mini", value: "gpt-4o-mini" },
      { label: "gpt-4.1", value: "gpt-4.1" },
      { label: "gpt-5.1", value: "gpt-5.1" },
      { label: "gpt-5.2", value: "gpt-5.2" },
    ],
    deepThinkingText: [],
  },
  gemini: {
    usuallyText: [
      { label: "gemini-2.0-flash", value: "gemini-2.0-flash" },
      { label: "gemini-2.0-flash-lite", value: "gemini-2.0-flash-lite" },
      { label: "gemini-1.5-pro", value: "gemini-1.5-pro" },
      { label: "gemini-1.5-flash", value: "gemini-1.5-flash" },
    ],
    deepThinkingText: [
      { label: "gemini-2.5-pro", value: "gemini-2.5-pro" },
      { label: "gemini-2.5-flash", value: "gemini-2.5-flash" },
    ],
  },
  anthropic: {
    usuallyText: [
      { label: "claude-opus-4-5", value: "claude-opus-4-5" },
      { label: "claude-haiku-4-5", value: "claude-haiku-4-5" },
      { label: "claude-sonnet-4-5", value: "claude-sonnet-4-5" },
      { label: "claude-opus-4-1", value: "claude-opus-4-1" },
      { label: "claude-opus-4-0", value: "claude-opus-4-0" },
      { label: "claude-sonnet-4-0", value: "claude-sonnet-4-0" },
      { label: "claude-3-7-sonnet-latest", value: "claude-3-7-sonnet-latest" },
      { label: "claude-3-5-haiku-latest", value: "claude-3-5-haiku-latest" },
    ],
    deepThinkingText: [],
  },
};
//图片模型预设
const imageModelPresets = {
  volcengine: {
    t2i: [{ label: "doubao-seedream-4-5-251128", value: "doubao-seedream-4-5-251128" }],
    i2i: [{ label: "doubao-seedream-4-5-251128", value: "doubao-seedream-4-5-251128" }],
  },
  kling: {
    t2i: [
      { label: "kling-v1", value: "kling-v1" },
      { label: "kling-v1-5", value: "kling-v1-5" },
      { label: "kling-v2", value: "kling-v2" },
      { label: "kling-v2-new", value: "kling-v2-new" },
      { label: "kling-v2-1", value: "kling-v2-1" },
    ],
    i2i: [
      { label: "kling-v1", value: "kling-v1" },
      { label: "kling-v1-5", value: "kling-v1-5" },
      { label: "kling-v2", value: "kling-v2" },
      { label: "kling-v2-new", value: "kling-v2-new" },
      { label: "kling-v2-1", value: "kling-v2-1" },
    ],
  },
  gemini: {
    t2i: [
      { label: "gemini-2.5-flash-image", value: "gemini-2.5-flash-image" },
      { label: "gemini-3-pro-image-preview", value: "gemini-3-pro-image-preview" },
    ],
    i2i: [
      { label: "gemini-2.5-flash-image", value: "gemini-2.5-flash-image" },
      { label: "gemini-3-pro-image-preview", value: "gemini-3-pro-image-preview" },
    ],
  },
  vidu: {
    t2i: [{ label: "viduq2", value: "viduq2" }],
    i2i: [{ label: "viduq2", value: "viduq2" }],
  },
  runninghub: {
    t2i: [{ label: "nanobanana", value: "nanobanana" }],
    i2i: [{ label: "nanobanana", value: "nanobanana" }],
  },
  apimart: {
    t2i: [{ label: "nanobanana", value: "nanobanana" }],
    i2i: [{ label: "nanobanana", value: "nanobanana" }],
  },
};
//视频模型预设
const videoModelPresets = {
  volcengine: {
    singleImage: [{ label: "doubao-seedance-1-0-pro-fast-251015", value: "doubao-seedance-1-0-pro-fast-251015" }],
    startEndRequired: [],
    endFrameOptional: [
      { label: "doubao-seedance-1-5-pro-251215", value: "doubao-seedance-1-5-pro-251215" },
      { label: "doubao-seedance-1-0-pro-250528", value: "doubao-seedance-1-0-pro-250528" },
      { label: "doubao-seedance-1-0-lite-i2v-250428", value: "doubao-seedance-1-0-lite-i2v-250428" },
    ],
    startFrameOptional: [],
    multiImage: [],
    reference: [{ label: "doubao-seedance-1-0-lite-i2v-250428", value: "doubao-seedance-1-0-lite-i2v-250428" }],
    text: [
      { label: "doubao-seedance-1-0-lite-t2v-250428", value: "doubao-seedance-1-0-lite-t2v-250428" },
      { label: "doubao-seedance-1-0-pro-fast-251015", value: "doubao-seedance-1-0-pro-fast-251015" },
      { label: "doubao-seedance-1-0-pro-250528", value: "doubao-seedance-1-0-pro-250528" },
      { label: "doubao-seedance-1-5-pro-251215", value: "doubao-seedance-1-5-pro-251215" },
    ],
  },
  runninghub: {
    singleImage: [
      { label: "sora-2", value: "sora-2" },
      { label: "sora-2-pro", value: "sora-2-pro" },
    ],
    startEndRequired: [],
    endFrameOptional: [],
    startFrameOptional: [],
    multiImage: [],
    reference: [],
    text: [
      { label: "sora-2", value: "sora-2" },
      { label: "sora-2-pro", value: "sora-2-pro" },
    ],
  },
  kling: {
    singleImage: [],
    startEndRequired: [
      { label: "kling-v1(STD)", value: "kling-v1(STD)" },
      { label: "kling-v1(PRO)", value: "kling-v1(PRO)" },
      { label: "kling-v1-6(PRO)", value: "kling-v1-6(PRO)" },
      { label: "kling-v1(PRO)", value: "kling-v1(PRO)" },
      { label: "kling-v1(STD)", value: "kling-v1(STD)" },
    ],
    endFrameOptional: [],
    startFrameOptional: [],
    multiImage: [],
    reference: [],
    text: [
      { label: "kling-v1(STD)", value: "kling-v1(STD)" },
      { label: "kling-v1(PRO)", value: "kling-v1(PRO)" },
      { label: "kling-v1-6(PRO)", value: "kling-v1-6(PRO)" },
      { label: "kling-v1(PRO)", value: "kling-v1(PRO)" },
      { label: "kling-v1(STD)", value: "kling-v1(STD)" },
    ],
  },
  gemini: {
    singleImage: [
      { label: "veo-3.1-generate-preview", value: "veo-3.1-generate-preview" },
      { label: "veo-3.1-fast-generate-preview", value: "veo-3.1-fast-generate-preview" },
      { label: "veo-3.0-generate-preview", value: "veo-3.0-generate-preview" },
      { label: "veo-3.0-fast-generate-preview", value: "veo-3.0-fast-generate-preview" },
      { label: "veo-2.0-generate-001", value: "veo-2.0-generate-001" },
    ],
    startEndRequired: [{ label: "veo-3.1-generate-preview", value: "veo-3.1-generate-preview" }],
    endFrameOptional: [{ label: "veo-3.1-generate-preview", value: "veo-3.1-generate-preview" }],
    startFrameOptional: [],
    multiImage: [],
    reference: [{ label: "veo-3.1-generate-preview", value: "veo-3.1-generate-preview" }],
    text: [
      { label: "veo-2.0-generate-001", value: "veo-2.0-generate-001" },
      { label: "veo-3.0-fast-generate-preview", value: "veo-3.0-fast-generate-preview" },
      { label: "veo-3.0-generate-preview", value: "veo-3.0-generate-preview" },
      { label: "veo-3.1-generate-preview", value: "veo-3.1-generate-preview" },
    ],
  },
  wan: {
    singleImage: [
      { label: "wan2.6-i2v-flash", value: "wan2.6-i2v-flash" },
      { label: "wan2.6-i2v", value: "wan2.6-i2v" },
      { label: "wan2.5-i2v-preview", value: "wan2.5-i2v-preview" },
      { label: "wan2.2-i2v-flash", value: "wan2.2-i2v-flash" },
      { label: "wan2.2-i2v-plus", value: "wan2.2-i2v-plus" },
      { label: "wanx2.1-i2v-plus", value: "wanx2.1-i2v-plus" },
      { label: "wanx2.1-i2v-turbo", value: "wanx2.1-i2v-turbo" },
    ],
    startEndRequired: [
      { label: "wanx2.1-kf2v-plus", value: "wanx2.1-kf2v-plus" },
      { label: "wan2.2-kf2v-flash", value: "wan2.2-kf2v-flash" },
    ],
    endFrameOptional: [],
    startFrameOptional: [],
    multiImage: [],
    reference: [],
    text: [
      { label: "wan2.6-t2v", value: "wan2.6-t2v" },
      { label: "wan2.5-t2v-preview", value: "wan2.5-t2v-preview" },
      { label: "wan2.2-t2v-plus", value: "wan2.2-t2v-plus" },
      { label: "wanx2.1-t2v-turbo", value: "wanx2.1-t2v-turbo" },
      { label: "wanx2.1-t2v-plus", value: "wanx2.1-t2v-plus" },
    ],
  },
  vidu: {
    singleImage: [
      { label: "viduq3-pro", value: "viduq3-pro" },
      { label: "viduq2-pro-fast", value: "viduq2-pro-fast" },
      { label: "viduq2-pro", value: "viduq2-pro" },
      { label: "viduq2-turbo", value: "viduq2-turbo" },
      { label: "viduq1", value: "viduq1" },
      { label: "viduq1-classic", value: "viduq1-classic" },
      { label: "vidu2.0", value: "vidu2.0" },
    ],
    startEndRequired: [
      { label: "vidu2.0", value: "vidu2.0" },
      { label: "viduq1-classic", value: "viduq1-classic" },
      { label: "viduq1", value: "viduq1" },
      { label: "viduq2-turbo", value: "viduq2-turbo" },
      { label: "viduq2-pro", value: "viduq2-pro" },
      { label: "viduq2-pro-fast", value: "viduq2-pro-fast" },
    ],
    endFrameOptional: [],
    startFrameOptional: [],
    multiImage: [],
    reference: [
      { label: "vidu2.0", value: "vidu2.0" },
      { label: "viduq1", value: "viduq1" },
      { label: "viduq2-turbo", value: "viduq2-turbo" },
      { label: "viduq2-pro", value: "viduq2-pro" },
    ],
    text: [
      { label: "viduq1", value: "viduq1" },
      { label: "viduq2-turbo", value: "viduq2-turbo" },
      { label: "viduq2-pro", value: "viduq2-pro" },
      { label: "viduq3-pro", value: "viduq3-pro" },
    ],
  },
};

const currentModelPresets = computed(() => {
  const { manufacturer, modelType } = modelForm.value;

  if (manufacturer === "other" || !manufacturer) {
    return [];
  }

  if (!modelType) {
    return [];
  }
  const textTypes = ["usuallyText", "deepThinkingText"];
  const imageTypes = ["t2i", "i2i"];
  const videoTypes = ["singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", "multiImage", "reference", "text"];
  let presets: Record<string, any> = {};

  if (textTypes.includes(modelType)) {
    presets = textModelPresets[manufacturer as keyof typeof textModelPresets] || {};
  } else if (imageTypes.includes(modelType)) {
    presets = imageModelPresets[manufacturer as keyof typeof imageModelPresets] || {};
  } else if (videoTypes.includes(modelType)) {
    presets = videoModelPresets[manufacturer as keyof typeof videoModelPresets] || {};
  }

  return presets[modelType as keyof typeof presets] || [];
});

// 获取当前模型类型对应的大类（text/image/video）
function getModelTypeCategory(modelType: string): string {
  const textTypes = ["usuallyText", "deepThinkingText"];
  const imageTypes = ["t2i", "i2i"];
  const videoTypes = ["singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", "multiImage", "reference", "text"];

  if (textTypes.includes(modelType)) return "text";
  if (imageTypes.includes(modelType)) return "image";
  if (videoTypes.includes(modelType)) return "video";
  return "";
}

// 监听厂商变化，清空不支持的模型类型
watch(
  () => modelForm.value.manufacturer,
  (newManufacturer, oldManufacturer) => {
    if (newManufacturer !== oldManufacturer && modelForm.value.modelType) {
      // 如果新厂商是 "other"，保留当前选择
      if (newManufacturer === "other") {
        return;
      }

      // 检查当前选择的模型类型是否被新厂商支持
      const supportedTypes = new Set<string>();

      if (textModelPresets[newManufacturer as keyof typeof textModelPresets]) {
        const textPresets = textModelPresets[newManufacturer as keyof typeof textModelPresets];
        Object.keys(textPresets).forEach((type) => {
          if (textPresets[type as keyof typeof textPresets]?.length > 0) {
            supportedTypes.add(type);
          }
        });
      }

      if (imageModelPresets[newManufacturer as keyof typeof imageModelPresets]) {
        const imagePresets = imageModelPresets[newManufacturer as keyof typeof imageModelPresets];
        Object.keys(imagePresets).forEach((type) => {
          if (imagePresets[type as keyof typeof imagePresets]?.length > 0) {
            supportedTypes.add(type);
          }
        });
      }

      if (videoModelPresets[newManufacturer as keyof typeof videoModelPresets]) {
        const videoPresets = videoModelPresets[newManufacturer as keyof typeof videoModelPresets];
        Object.keys(videoPresets).forEach((type) => {
          if (videoPresets[type as keyof typeof videoPresets]?.length > 0) {
            supportedTypes.add(type);
          }
        });
      }

      // 如果当前选择的类型不被支持，清空选择
      if (!supportedTypes.has(modelForm.value.modelType)) {
        modelForm.value.modelType = "";
        modelForm.value.model = "";
      }
    }
  },
);

// 监听厂商和模型类型变化，自动填充默认 baseUrl
watch(
  () => [modelForm.value.manufacturer, modelForm.value.modelType],
  ([newManufacturer, newModelType]) => {
    if (newManufacturer && newModelType && newManufacturer !== "runninghub") {
      const category = getModelTypeCategory(newModelType as string);
      if (category && manufacturerDefaultBaseUrls[newManufacturer]) {
        const defaultUrl = manufacturerDefaultBaseUrls[newManufacturer][category];
        if (defaultUrl) {
          modelForm.value.baseUrl = defaultUrl;
        }
      }
    }
  },
);
// 获取默认 BaseURL 的 placeholder
function getDefaultBaseUrlPlaceholder(): string {
  const { manufacturer, modelType } = modelForm.value;
  if (!manufacturer || !modelType || manufacturer === "runninghub") {
    return "请输入 Base URL";
  }

  const category = getModelTypeCategory(modelType);
  if (category && manufacturerDefaultBaseUrls[manufacturer]) {
    const defaultUrl = manufacturerDefaultBaseUrls[manufacturer][category];
    return defaultUrl ? `默认: ${defaultUrl}` : "请输入 Base URL";
  }

  return "请输入 Base URL";
}

const emit = defineEmits(["fetchModelList"]);
//保存模型
async function keep() {
  let type = "";
  const { modelType } = modelForm.value;

  const textTypes = ["usuallyText", "deepThinkingText"];
  const imageTypes = ["t2i", "i2i"];
  const videoTypes = ["singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", "multiImage", "reference", "text"];
  if (textTypes.includes(modelType)) {
    type = "text";
  } else if (imageTypes.includes(modelType)) {
    type = "image";
  } else if (videoTypes.includes(modelType)) {
    type = "video";
  }
  if (modelForm.value.id == 0) {
    try {
      await axios.post("/setting/addModel", {
        modelType: modelForm.value.modelType,
        type,
        model: modelForm.value.model,
        baseUrl: modelForm.value.baseUrl,
        manufacturer: modelForm.value.manufacturer,
        apiKey: modelForm.value.apiKey,
      });
      message.success("新增成功");
      emit("fetchModelList");
    } catch (e) {
      message.error("新增失败");
    }
  } else {
    try {
      await axios.post("/setting/updateModel", {
        id: modelForm.value.id,
        type,
        modelType: modelForm.value.modelType,
        model: modelForm.value.model,
        baseUrl: modelForm.value.baseUrl,
        manufacturer: modelForm.value.manufacturer,
        apiKey: modelForm.value.apiKey,
      });
      message.success("编辑成功");
      emit("fetchModelList");
    } catch (e) {
      message.error("编辑失败");
    }
  }

  modelShow.value = false; //关闭弹窗
}
</script>

<style lang="scss" scoped></style>
