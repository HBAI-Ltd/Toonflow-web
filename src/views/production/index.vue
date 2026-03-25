<template>
  <VueFlow
    class="flowMain"
    :nodes="episodesId ? nodes : []"
    :edges="episodesId ? edges : []"
    :max-zoom="10"
    :min-zoom="0.1"
    fit-view-on-init
    :selection-key-code="null"
    :multi-selection-key-code="null">
    <template #node-script="props">
      <scriptNode :id="props.id" v-model="flowData.script" :handleIds="props.data.handleIds" />
    </template>
    <template #node-scriptPlan="props">
      <scriptPlan :id="props.id" v-model="flowData.scriptPlan" :handleIds="props.data.handleIds" />
    </template>
    <template #node-storyboardTable="props">
      <storyboardTable :id="props.id" v-model="flowData.storyboardTable" :handleIds="props.data.handleIds" />
    </template>
    <template #node-assets="props">
      <assets :id="props.id" v-model="flowData.assets" :handleIds="props.data.handleIds" />
    </template>
    <template #node-storyboard="props">
      <storyboard :id="props.id" v-model="flowData.storyboard" :assetsData="flowData.assets" :handleIds="props.data.handleIds" />
    </template>
    <template #node-workbench="props">
      <workbench :id="props.id" v-model="flowData.workbench" :handleIds="props.data.handleIds" />
    </template>
    <template #node-poster="props">
      <poster :id="props.id" v-model="flowData.poster" :handleIds="props.data.handleIds" />
    </template>
    <Background></Background>
    <Controls />
    <div class="floatingWindow">
      <div class="episodesSelect f ac">
        <t-select v-model="episodesId" :placeholder="$t('workbench.production.selectPlaceholder')" autoWidth :options="episodesOptions" filterable>
          <template #label>
            <i-document-folder size="24" />
          </template>
        </t-select>
        <i-loading-four class="spin" size="16" style="margin-left: 0.5rem" v-show="loading"></i-loading-four>
      </div>
      <div class="openRightChatBoxBtn c" v-show="!openShowVisible" @click.stop="openShowVisible = true">
        <i-menu-unfold-one theme="outline" size="24" fill="#000000" />
      </div>
      <transition name="slide" v-show="openShowVisible" v-if="episodesId">
        <rightChatBox v-model="flowData" :title="rightChatTitle" @close="openShowVisible = false" :episodesId="episodesId" />
      </transition>
    </div>
    <t-guide v-model="current" :steps="steps" @finish="finishGuide" />
  </VueFlow>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
//子node组件
import scriptNode from "./node/script.vue";
import scriptPlan from "./node/scriptPlan.vue";
import assets from "./node/assets.vue";
import storyboardTable from "./node/storyboardTable.vue";
import storyboard from "./node/storyboard.vue";
import workbench from "./node/workbench.vue";
import poster from "./node/poster.vue";
//悬浮窗组件
import rightChatBox from "./components/rightChatBox/index.vue";

import { useFlowBuilder, type FlowData } from "./utils/flowBuilder";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const { project } = storeToRefs(projectStore());

const openShowVisible = ref(true);

const episodesId = ref<number>();

const rightChatTitle = computed(() => {
  const episode = episodesOptions.value.find((option) => option.value === episodesId.value);
  return episode ? episode.label : "";
});

const episodesOptions = ref<{ label: string; value: number }[]>([]);

// ==================== AI 操作数据区 ====================
// AI 只需修改此对象即可控制整个故事线流程
const flowData = ref<FlowData>({
  // 剧本
  script: "",
  scriptPlan: "",
  // 资产
  assets: [],
  // 分镜表（合并为一个 node）
  storyboardTable: ``,
  // 分镜（合并为一个 node）
  storyboard: [],
  // 工作台（单个 node）
  workbench: {
    name: "",
    duration: "",
    resolution: "",
    fps: "",
  },
  // 封面（单个 node）
  poster: {
    items: [
      { id: 1, image: "https://picsum.photos/seed/1/600/360" },
      { id: 2, image: "https://picsum.photos/seed/2/600/360" },
      { id: 3, image: "https://picsum.photos/seed/3/600/360" },
      { id: 4, image: "https://picsum.photos/seed/4/600/360" },
    ],
  },
});
// ==================== AI 操作数据区结束 ====================

// 节点位置（独立于 AI 数据，由用户拖拽控制）
const nodePositions = ref<Record<string, { x: number; y: number }>>({
  script: { x: 0, y: 0 },
  scriptPlan: { x: 900, y: 0 },
  assets: { x: 0, y: 1500 },
  storyboardTable: { x: 1800, y: 0 },
  storyboard: { x: 2700, y: 0 },
  workbench: { x: 3600, y: 0 },
  poster: { x: 4500, y: 0 },
});

// 自动构建 nodes 和 edges
const { nodes, edges } = useFlowBuilder(flowData, nodePositions);

const current = useLocalStorage("productionGuideCurrent", 0);
const steps = [
  {
    element: ".episodesSelect",
    title: $t("workbench.production.guideSwitchEpisode"),
    body: $t("workbench.production.guideSwitchEpisodeBody"),
    placement: "bottom",
  },
] as any;
function finishGuide() {
  current.value = -1;
}

const loading = ref(false);

async function getData() {
  //获取剧本
  const { data: scriptRes } = await axios.post("/script/getScrptApi", {
    projectId: project.value?.id,
    name: "",
  });

  episodesOptions.value = scriptRes.map((ep: any) => ({
    label: ep.name,
    value: ep.id,
  }));
  if (episodesOptions.value.length) {
    episodesId.value = episodesOptions.value[0].value;
  }
}
watch(
  () => episodesId.value,
  async (newVal) => {
    const { data } = await axios.post("/production/getFlowData", {
      projectId: project.value?.id,
      episodesId: episodesId.value,
    });
    console.log("%c Line:222 🍇 data", "background:#ea7e5c", data);

    flowData.value = data;
  },
);
async function saveFlowData() {
  await axios.post("/production/saveFlowData", {
    projectId: project.value?.id,
    episodesId: episodesId.value,
    data: flowData.value,
  });
}

watch(
  flowData,
  (newVal) => {
    loading.value = true;
    saveFlowData().finally(() => {
      loading.value = false;
    });
  },
  { deep: true },
);

onMounted(() => {
  loading.value = true;
  getData().finally(() => {
    loading.value = false;
  });
});
</script>
<style lang="scss" scoped>
.flowMain {
  height: 100%;
  .floatingWindow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    .episodesSelect {
      position: absolute;
      top: 10px;
      left: 0px;
      z-index: 9999;
      cursor: pointer;
      cursor: pointer;
    }
    .openRightChatBoxBtn {
      position: absolute;
      top: 10px;
      right: 0;
      width: 40px;
      height: 40px;
      background-color: #ecedef;
      border-radius: 10px;
      z-index: 10;
      cursor: pointer;
    }
  }
  :deep(.slide-enter-active),
  :deep(.slide-leave-active) {
    transition: transform 0.3s ease-out;
  }
  :deep(.slide-enter-from) {
    transform: translateX(100%);
  }
  :deep(.slide-leave-to) {
    transform: translateX(100%);
  }
}
$handelSize: 12px;

:deep(.source) {
  height: $handelSize;
  width: $handelSize;
}
:deep(.target) {
  height: $handelSize;
  width: $handelSize;
}
:deep(.dragHandle) {
  padding: 4px;
  border-radius: 4px;
  transition: backdrop-filter 0.3s ease-out;
  &:hover {
    cursor: move;
    backdrop-filter: brightness(0.95);
  }
}
</style>
