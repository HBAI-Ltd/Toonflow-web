<template>
  <div class="aiConfog">
    <div class="banner">
      <div class="content f ac jb">
        <div class="textContent ac">
          <i-good-two class="icon" theme="filled" size="24" fill="currentColor" />
          <span>使用 Toonflow 官方中转站点，支持一键填入配置，开箱即用，无需手动配置。</span>
        </div>
        <div class="btnList">
          <t-button>
            进入网站
            <template #suffix>
              <i-share theme="outline" />
            </template>
          </t-button>
          <t-button>填入KEY</t-button>
        </div>
      </div>
    </div>

    <div class="cardGrid">
      <t-card hoverShadow v-for="item in modelData" :key="item.key" class="skillCard" @click="startConfig(item)">
        <div class="skillCardHeader">
          <div class="headerLeft">
            <t-avatar size="32px" v-if="getProviderLogo(item.manufacturer)" :image="getProviderLogo(item.manufacturer)!" />
            <t-avatar size="32px" v-else shape="round">
              <template #icon><i-robot theme="outline" size="18" fill="currentColor" /></template>
            </t-avatar>
            <span class="skillName">{{ item.name }}</span>
          </div>
          <t-tag v-if="item.model" theme="primary" variant="light" size="small">{{ item.model }}</t-tag>
          <t-tag v-else theme="warning" variant="light" size="small">未配置</t-tag>
        </div>
        <div class="skillCardBody">{{ item.desc }}</div>
      </t-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import providersLogo from "@/utils/ai/providersLogo";

interface ModelType {
  id: number;
  model: string;
  name: string;
  key: string;
  manufacturer: string;
  desc: string;
}

const modelData = ref<ModelType[]>([
  {
    id: 1,
    model: "deepseek-v3",
    name: "剧本Agent",
    key: "storyboardAgent",
    manufacturer: "deepSeek",
    desc: "根据剧本自动生成分镜描述，将文字转化为画面指令",
  },
  {
    id: 2,
    model: "qwen-max",
    name: "分镜Agent",
    key: "outlineScriptAgent",
    manufacturer: "qwen",
    desc: "从小说原文提取关键情节，生成结构化剧本大纲",
  },
  { id: 3, model: "glm-4-plus", name: "资产AI", key: "assetsPrompt", manufacturer: "zhipu", desc: "根据角色和场景要素，生成精准的素材提示词" },
  { id: 4, model: "gpt-4o", name: "润色AI", key: "generateScript", manufacturer: "openai", desc: "将大纲扩展为完整剧本脚本，包含对话和场景描写" },
]);

const modelDataShow = ref(false);

function getProviderLogo(manufacturer: string) {
  if (!manufacturer) return null;
  const key = Object.keys(providersLogo).find((k) => k.toLowerCase() === manufacturer.toLowerCase());
  return key ? providersLogo[key as keyof typeof providersLogo] : null;
}

function startConfig(item: ModelType) {
  modelDataShow.value = true;
}
</script>

<style lang="scss" scoped>
.aiConfog {
  display: flex;
  flex-direction: column;
  .banner {
    background-color: var(--td-success-color-focus);
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
    .content {
      width: 100%;
      .icon {
        color: var(--td-success-color);
        margin-right: 0.5em;
      }
      .btnList {
        & > * {
          margin-left: 8px;
        }
      }
    }
  }
}

.cardGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.skillCard {
  cursor: pointer;
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.skillCardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .headerLeft {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .skillName {
    font-size: 15px;
    font-weight: 600;
  }
}

.skillCardBody {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}
</style>
