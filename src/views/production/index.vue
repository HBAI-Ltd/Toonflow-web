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
    <!-- <template #node-poster="props">
      <poster :id="props.id" v-model="flowData.poster" :handleIds="props.data.handleIds" />
    </template> -->
    <Background></Background>
    <Controls />
    <div class="floatingWindow">
      <div class="episodesSelect f ac">
        <t-select v-model="episodesId" :placeholder="$t('workbench.production.selectPlaceholder')" autoWidth :options="episodesOptions" filterable>
          <template #label>
            <i-document-folder size="24" />
          </template>
        </t-select>
        <t-tooltip placement="bottom" theme="primary" content="$t('workbench.production.getFlowData')">
          <t-button @click="refFlowData" variant="outline" style="margin-left: 8px">
            <template #icon>
              <i-refresh size="16" />
            </template>
          </t-button>
        </t-tooltip>
        <t-tooltip placement="bottom" theme="primary" content="$t('workbench.production.autoLayoutLR')">
          <t-button @click="layoutGraph()" variant="outline">
            <template #icon>
              <i-tree-diagram size="16" />
            </template>
          </t-button>
        </t-tooltip>
        <i-loading-four class="spin" size="16" style="margin-left: 0.5rem" v-show="loading"></i-loading-four>
        <!-- <t-tooltip theme="primary" content="$t('workbench.production.autoLayoutTB')">
          <div class="item c" @click="layoutGraph('TB')">
            <i-branch-one theme="outline" size="24" />
          </div>
        </t-tooltip> -->
      </div>
      <div class="openRightChatBoxBtn c" v-show="!openShowVisible" @click.stop="openShowVisible = true">
        <i-menu-unfold-one theme="outline" size="24" fill="#000000" />
      </div>
      <transition name="slide" v-show="openShowVisible" v-if="episodesId">
        <rightChatBox :title="title" v-model="flowData" @close="openShowVisible = false" />
      </transition>
    </div>
    <!-- <t-guide v-model="current" :steps="steps" @finish="finishGuide" /> -->
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
import rightChatBox from "./components/rightChatBox/index.vue";
import { useLayout } from "./utils/dagre";
import { useFlowBuilder, type FlowData } from "./utils/flowBuilder";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const { project } = storeToRefs(projectStore());
const openShowVisible = ref(true);
const { toObject, fromObject, fitView, findNode } = useVueFlow();
const { layout } = useLayout();

import productionAgentStore from "@/stores/productionAgent";
const { episodesId, flowData } = storeToRefs(productionAgentStore());
provide("episodesId", episodesId);

const loading = ref(false);

// 节点位置
const nodePositions = ref<Record<string, { x: number; y: number }>>({
  script: { x: 0, y: 0 },
  scriptPlan: { x: 900, y: 0 },
  assets: { x: 0, y: 1500 },
  storyboardTable: { x: 1800, y: 0 },
  storyboard: { x: 2700, y: 0 },
  workbench: { x: 3600, y: 0 },
  // poster: { x: 4500, y: 0 },
});
const { nodes, edges } = useFlowBuilder(flowData, nodePositions);

onMounted(() => {
  getScriptData();
});

const episodesOptions = ref<{ label: string; value: number }[]>([]);

async function getScriptData() {
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

async function layoutGraph(direction: "LR" | "TB" = "LR") {
  const spacing = 200;
  const oldData = toObject();
  oldData.nodes = layout(oldData.nodes, oldData.edges, direction, spacing);
  // LR 布局时，强制调整各节点位置
  if (direction === "LR") {
    const scriptNode = oldData.nodes.find((n) => n.id === "script");
    const assetsNode = oldData.nodes.find((n) => n.id === "assets");
    const scriptVNode = findNode("script");
    const scriptHeight = scriptVNode?.dimensions?.height ?? 50;

    // assets 放在 script 正下方，左对齐，顶部紧接 script 底部
    if (scriptNode && assetsNode) {
      assetsNode.position.x = scriptNode.position.x;
      assetsNode.position.y = scriptNode.position.y + scriptHeight + spacing;
    }

    // 主链节点（scriptPlan 及之后）全部与 script 顶部对齐
    if (scriptNode) {
      const mainChain = ["scriptPlan", "storyboardTable", "storyboard", "workbench", "poster"];
      for (const id of mainChain) {
        const node = oldData.nodes.find((n) => n.id === id);
        if (node) {
          node.position.y = scriptNode.position.y;
        }
      }
    }
  }
  await fromObject(oldData);
  await nextTick();
  fitView({ duration: 300 });
}

const title = computed(() => {
  const episode = episodesOptions.value.find((option) => option.value === episodesId.value);
  return episode ? episode.label : "";
});

watch(
  () => episodesId.value,
  async (newVal) => {
    refFlowData();
  },
);

async function refFlowData() {
  await productionAgentStore().getFlowData();
  layoutGraph();
}
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

      .item {
        width: 50px;
        padding: 5px;
        color: var(--mainColor);
        &:hover {
          background-color: #f4f4f4;
          border-radius: 4px;
          cursor: pointer;
        }
      }
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
