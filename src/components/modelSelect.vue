<template>
  <t-select :size="props.size" v-model="selectValue" :placeholder="props.placeholder" @change="onChange">
    <t-option-group v-for="(list, index) in optionsData" :key="index" :label="list.group">
      <t-option v-for="item in list.children" :key="item.id" :value="`${item.id}:${item.value}`" :label="item.label">
        <div class="optionItem">
          <div class="optionMain">
            <t-avatar
              v-if="getProviderLogoByModel(item.label, item.value)"
              size="24px"
              shape="round"
              :image="getProviderLogoByModel(item.label, item.value)!" />
            <t-avatar v-else size="24px" shape="round" class="fallbackAvatar">{{ getFallbackText(item.label) }}</t-avatar>
            <div class="optionLabel">{{ item.label }}</div>
          </div>
          <span class="optionType">{{ item.type }}</span>
        </div>
      </t-option>
    </t-option-group>
  </t-select>
</template>

<script setup lang="ts">
import providersLogo from "@/utils/ai/providersLogo";

import axios from "@/utils/axios";
interface VendorChild {
  id: number;
  label: string;
  value: string;
  vendorId: number;
  type: string;
}

interface VendorOption {
  group: string;
  id: number;
  children: VendorChild[];
}
const selectValue = defineModel({
  type: String,
  default: "",
});

const props = defineProps({
  type: {
    type: String as () => "text" | "image" | "all" | "video",
    default: "all",
  },
  size: {
    type: String as () => "small" | "medium" | "large",
    default: "medium",
  },
  placeholder: {
    type: String,
    default: $t("components.modelSelect.placeholder"),
  },
  changeConfig: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits<{
  change: [value: string, data?: any];
}>();
async function onChange(value: any) {
  selectValue.value = value;
  if (props.changeConfig) {
    const { data } = await axios.post("/modelSelect/getModelDetail", {
      modelId: value,
    });
    emit("change", value, data);
  } else {
    emit("change", value);
  }
}
const optionsData = ref<VendorOption[]>([]);
onMounted(() => {
  handleModelChange();
});
const titleMap = {
  image: $t("components.modelSelect.type.image"),
  text: $t("components.modelSelect.type.text"),
  video: $t("components.modelSelect.type.video"),
};
//获取模型选择API数据
function handleModelChange() {
  axios
    .post("/modelSelect/getModelList", { type: props.type })
    .then((response) => {
      const groupMap = new Map<string, VendorOption>();
      response.data.forEach((item: any) => {
        const groupKey = item.name;
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            group: groupKey,
            id: item.id,
            children: [],
          });
        }
        groupMap.get(groupKey)!.children.push({
          id: item.id,
          label: item.label,
          value: item.value,
          vendorId: item.vendorId,
          type: titleMap[item.type as "image" | "text" | "video"],
        });
      });
      optionsData.value = Array.from(groupMap.values());

      if (
        optionsData.value
          .map((i) => i.children)
          .flat()
          .every((i) => `${i.id}:${i.value}` !== selectValue.value)
      ) {
        selectValue.value = "";
      }
    })
    .catch((error) => {
      console.error($t("components.modelSelect.msg.fetchModelFailed"), error);
    });
}

const modelProviderRules: Array<{ pattern: RegExp; provider: keyof typeof providersLogo }> = [
  { pattern: /gpt|o1|o3|o4|openai/i, provider: "openai" },
  { pattern: /claude|anthropic/i, provider: "anthropic" },
  { pattern: /deepseek/i, provider: "deepSeek" },
  { pattern: /gemini|veo/i, provider: "gemini" },
  { pattern: /qwen|qwq|tongyi|通义|wanx|万相|wan/i, provider: "qwen" },
  { pattern: /glm|zhipu|智谱/i, provider: "zhipu" },
  { pattern: /doubao|seedream|seedance|volc/i, provider: "volcengine" },
  { pattern: /kling|可灵/i, provider: "kling" },
  { pattern: /vidu/i, provider: "vidu" },
  { pattern: /runninghub/i, provider: "runninghub" },
  { pattern: /grok|xai|grsai/i, provider: "grsai" },
];

function getProviderLogoByModel(label?: string, value?: string) {
  const source = `${label || ""} ${value || ""}`.trim();
  if (!source) return null;
  const matchedRule = modelProviderRules.find((rule) => rule.pattern.test(source));
  return matchedRule ? providersLogo[matchedRule.provider] : null;
}

function getFallbackText(label: string) {
  return label?.slice(0, 1)?.toUpperCase() || "M";
}
</script>

<style lang="scss" scoped>
.optionItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.optionMain {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.optionLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.optionType {
  color: var(--td-text-color-secondary);
  flex-shrink: 0;
}

.fallbackAvatar {
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
</style>
