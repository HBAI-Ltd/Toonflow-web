<template>
  <div class="aiConfog">
    <div v-for="(item, index) in modelData" :key="index" class="modelCardItem" @click="startConfig(item)">
      <t-card hover-shadow>
        <t-comment :author="item.name" :datetime="getAiType(item.key)">
          <template #avatar>
            <t-avatar size="large" v-if="getProviderLogo(item.manufacturer)" :image="getProviderLogo(item.manufacturer)!"></t-avatar>
          </template>
          <template #content>
            <div v-if="item.model">
              <t-tag theme="primary">{{ item.model }}</t-tag>
            </div>
            <div class="ac" v-else>
              <i-attention theme="outline" size="14" fill="#faad14" />
              <span>未配置</span>
            </div>
          </template>
        </t-comment>
      </t-card>
    </div>
  </div>
  <modelDataDom v-model:modelDataShow="modelDataShow" :currentType="currentType" v-model:configingModel="configingModel" @modelList="modelList" />
</template>

<script setup lang="ts">
import modelDataDom from "../model/modelData.vue";
import providersLogo from "@/utils/ai/providersLogo";
import axios from "@/utils/axios";

interface ModelType {
  id: number;
  model: string;
  name: string;
  key: string;
  manufacturer: string;
}

const modelData = ref<ModelType[]>([]);
const modelDataShow = ref(false);

onMounted(async () => {
  const res = await axios.post("/setting/getAiModelMap");
  modelData.value = res.data;
});

function getAiType(key: string) {
  if (key.includes("Agent")) return "文本模型";
  if (key.includes("Script") || key.includes("Prompt")) return "文本模型";
  return "图片模型";
}

function getProviderLogo(manufacturer: string) {
  if (!manufacturer) return null;
  // 尝试直接匹配
  if (providersLogo[manufacturer as keyof typeof providersLogo]) {
    return providersLogo[manufacturer as keyof typeof providersLogo];
  }
  // 尝试小写匹配
  const lowerKey = manufacturer.toLowerCase();
  for (const key of Object.keys(providersLogo)) {
    if (key.toLowerCase() === lowerKey) {
      return providersLogo[key as keyof typeof providersLogo];
    }
  }
  return null;
}

const configingModel = ref<ModelType>();
const currentType = ref("");

// 开始配置
function startConfig(item: ModelType) {
  configingModel.value = item;
  const imageKey = ["editImage", "storyboardImage", "assetsImage"];
  const textKey = ["storyboardAgent", "outlineScriptAgent", "assetsPrompt", "generateScript", "videoPrompt"];
  if (imageKey.includes(item.key)) {
    currentType.value = "image";
  } else if (textKey.includes(item.key)) {
    currentType.value = "text";
  }
  modelDataShow.value = true;
}

async function modelList() {
  const res = await axios.post("/setting/getAiModelMap");
  modelData.value = res.data;
}
</script>

<style lang="scss" scoped>
.aiConfog {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  .modelCardItem {
    cursor: pointer;
  }
}
</style>
