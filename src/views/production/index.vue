<template>
  <VueFlow
    class="flowMain"
    :class="{ 'is-interacting': isInteracting && otherSetting.interacting, 'space-dragging': isSpacePressed }"
    id="mainFlowBox"
    @mousedown="onSpaceMouseDown"
    :nodes="episodesId ? nodes : []"
    :edges="episodesId ? edges : []"
    :nodes-draggable="!isSpacePressed"
    :nodes-connectable="!isSpacePressed"
    :elements-selectable="!isSpacePressed"
    :max-zoom="10"
    :min-zoom="0.1"
    fit-view-on-init
    :pan-on-scroll="canvasWheelEvent == 'scroll' ? true : false"
    :zoom-on-scroll="canvasWheelEvent == 'zoom' ? true : false"
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
        <t-select
          :value="episodesId"
          :placeholder="$t('workbench.production.selectPlaceholder')"
          autoWidth
          :options="episodesOptions"
          filterable
          @change="handleEpisodesChange">
          <template #label>
            <i-document-folder size="24" />
          </template>
        </t-select>
        <t-tooltip placement="bottom" theme="primary" :content="$t('workbench.production.getFlowData')">
          <t-button class="guide-refresh-btn" @click="refFlowData" variant="outline">
            <template #icon>
              <i-refresh size="16" />
            </template>
          </t-button>
        </t-tooltip>
        <t-tooltip placement="bottom" theme="primary" :content="$t('workbench.production.autoLayoutLR')">
          <t-button class="guide-layout-btn" @click="layoutGraph()" variant="outline" style="margin-left: 8px">
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
        <i-menu-unfold-one theme="outline" size="24" />
      </div>
      <transition name="slide" v-show="openShowVisible" v-if="episodesId">
        <rightChatBox :title="title" v-model="flowData" @close="openShowVisible = false" />
      </transition>
    </div>
    <t-guide v-model="current" :steps="steps" @finish="() => (current = -1)" />
    <t-tag variant="outline" class="fps" v-if="!openShowVisible">{{ fps }}</t-tag>
  </VueFlow>
</template>

<script setup lang="ts">
import { useLocalStorage, useEventListener } from "@vueuse/core";
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
import { useFlowBuilder } from "./utils/flowBuilder";
import axios from "@/utils/axios";
import projectStore from "@/stores/project";

const { project } = storeToRefs(projectStore());
import settingStore from "@/stores/setting";
const { canvasWheelEvent, otherSetting } = storeToRefs(settingStore());
const openShowVisible = ref(true);
const {
  toObject,
  fromObject,
  fitView,
  findNode,
  onNodeDragStart,
  onNodeDragStop,
  onMoveStart,
  onMoveEnd,
  updateNodeInternals,
  getNodes,
  getViewport,
  setViewport,
} = useVueFlow({ id: "mainFlowBox" });

// 按住空格+左键拖拽画布（即使在节点上）
const isSpacePressed = ref(false);
let dragOrigin = { x: 0, y: 0, vx: 0, vy: 0 };

function onSpaceMouseDown(e: MouseEvent) {
  if (!isSpacePressed.value || e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const vp = getViewport();
  dragOrigin = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };
  document.addEventListener("mousemove", onSpaceMouseMove);
  document.addEventListener("mouseup", onSpaceMouseUp, { once: true });
}
function onSpaceMouseMove(e: MouseEvent) {
  setViewport({ x: dragOrigin.vx + e.clientX - dragOrigin.x, y: dragOrigin.vy + e.clientY - dragOrigin.y, zoom: getViewport().zoom });
}
function onSpaceMouseUp() {
  document.removeEventListener("mousemove", onSpaceMouseMove);
}

useEventListener(document, "keydown", (e: KeyboardEvent) => {
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    isSpacePressed.value = true;
  }
});
useEventListener(document, "keyup", (e: KeyboardEvent) => {
  if (e.code === "Space") isSpacePressed.value = false;
});

// 拖拽/平移期间降低渲染复杂度，优化性能
const isInteracting = ref(false);
let interactionTimer: ReturnType<typeof setTimeout> | null = null;

function startInteracting() {
  if (interactionTimer) clearTimeout(interactionTimer);
  isInteracting.value = true;
}
function stopInteracting() {
  // 延迟恢复，避免频繁切换
  if (interactionTimer) clearTimeout(interactionTimer);
  interactionTimer = setTimeout(() => {
    isInteracting.value = false;
  }, 150);
}

onNodeDragStart(() => startInteracting());
onMoveStart(() => startInteracting());
onMoveEnd(() => stopInteracting());
const { layout } = useLayout("mainFlowBox");

import productionAgentStore from "@/stores/productionAgent";
const { episodesId, flowData, status } = storeToRefs(productionAgentStore());
provide("episodesId", episodesId);

const loading = ref(false);

// 节点位置
const nodePositions = ref<Record<string, { x: number; y: number }>>({
  script: { x: 0, y: 0 },
  scriptPlan: { x: 900, y: 0 },
  assets: { x: 1200, y: 4000 },
  storyboardTable: { x: 1800, y: 0 },
  storyboard: { x: 2500, y: 0 },
  workbench: { x: 3000, y: 0 },
  // poster: { x: 4500, y: 0 },
});
const { nodes, edges } = useFlowBuilder(flowData, nodePositions);

// 用户拖拽节点后，同步位置到 nodePositions，防止 flowData 更新时位置被复原
onNodeDragStop(async ({ nodes: draggedNodes }) => {
  await nextTick();
  stopInteracting();
  for (const node of draggedNodes) {
    nodePositions.value[node.id] = { x: node.position.x, y: node.position.y };
  }
});

// flowData 变化时，将 VueFlow 中节点的当前实际位置同步到 nodePositions，防止位置回跳
watch(
  flowData,
  () => {
    for (const node of getNodes.value) {
      nodePositions.value[node.id] = { x: node.position.x, y: node.position.y };
    }
  },
  { deep: true },
);

async function waitForNodesReady(maxRetries = 60, delay = 100) {
  while (maxRetries-- > 0) {
    const nodes = getNodes.value;
    if (nodes.length > 0) {
      // 等待所有节点的 DOM 尺寸都已被 VueFlow 测量完成
      const allMeasured = nodes.every((n) => n.dimensions?.width && n.dimensions.width > 0);
      if (allMeasured) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false;
}

onMounted(async () => {
  await getScriptData();
  if (!episodesId.value) return;

  const nodesReady = await waitForNodesReady();
  if (nodesReady) {
    await layoutGraph();
  }
});

const episodesOptions = ref<{ label: string; value: number }[]>([]);
function confirmEpisodesSwitch() {
  if (status.value !== "pending" && status.value !== "streaming") {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const dialog = DialogPlugin.confirm({
      header: $t("workbench.production.confirm"),
      body: $t("workbench.production.confirmEpisodesSwitch"),
      confirmBtn: $t("workbench.production.save"),
      cancelBtn: $t("workbench.production.cancel"),
      theme: "warning",
      onConfirm: () => {
        dialog.destroy();
        resolve(true);
      },
      onCancel: () => {
        dialog.destroy();
        resolve(false);
      },
      onClose: () => {
        dialog.destroy();
        resolve(false);
      },
    });
  });
}

function handleEpisodesChange(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const nextEpisodesId = Number(rawValue);
  if (!Number.isFinite(nextEpisodesId) || nextEpisodesId === episodesId.value) return;

  void (async () => {
    if (!(await confirmEpisodesSwitch())) return;

    episodesId.value = nextEpisodesId;
    await productionAgentStore().getFlowData();
  })();
}

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

  await productionAgentStore().getHistory();
}

async function layoutGraph(direction: "LR" | "TB" = "LR") {
  // 等待 DOM 渲染完成
  await nextTick();

  // 强制 VueFlow 重新测量所有节点尺寸
  const nodeIds = getNodes.value.map((n) => n.id);
  updateNodeInternals(nodeIds);
  await nextTick();

  // 等待所有节点的 dimensions 都已被 VueFlow 正确测量且尺寸稳定
  let retries = 30;
  let lastSnapshot = "";
  let stableCount = 0;
  while (retries-- > 0) {
    const allMeasured = nodeIds.every((id) => {
      const node = findNode(id);
      return node?.dimensions?.width && node.dimensions.width > 0;
    });
    if (allMeasured) {
      // 检查尺寸是否稳定（连续两次相同才算就绪）
      const snapshot = nodeIds
        .map((id) => {
          const node = findNode(id);
          return `${id}:${node?.dimensions?.width}x${node?.dimensions?.height}`;
        })
        .join(",");
      if (snapshot === lastSnapshot) {
        stableCount++;
        if (stableCount >= 2) break;
      } else {
        stableCount = 0;
        lastSnapshot = snapshot;
      }
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const oldData = toObject();

  // 从 VueFlow 内部获取已测量的尺寸（流坐标系，无需 zoom 换算）
  const dims = new Map<string, { w: number; h: number }>();
  for (const n of oldData.nodes) {
    const vNode = findNode(n.id);
    dims.set(n.id, {
      w: vNode?.dimensions?.width ?? 150,
      h: vNode?.dimensions?.height ?? 50,
    });
  }

  const gap = 80; // 节点之间的最小留白

  if (direction === "LR") {
    // 手动布局：主链从左到右排列，assets 放在 script 正下方
    const mainChain = ["script", "scriptPlan", "storyboardTable", "storyboard", "workbench", "poster"];
    const chainNodes = mainChain.filter((id) => oldData.nodes.some((n) => n.id === id));

    // 逐个排列主链节点，x 基于前一个节点的右边缘 + gap，顶部对齐
    let curX = 0;
    for (const id of chainNodes) {
      const node = oldData.nodes.find((n) => n.id === id);
      const dim = dims.get(id);
      if (!node || !dim) continue;
      node.position.x = curX;
      node.position.y = 0;
      curX += dim.w + gap;
    }

    // assets 放在 script 正下方
    const scriptNode = oldData.nodes.find((n) => n.id === "script");
    const assetsNode = oldData.nodes.find((n) => n.id === "assets");
    const scriptDim = dims.get("script");
    if (scriptNode && assetsNode && scriptDim) {
      assetsNode.position.x = scriptNode.position.x;
      assetsNode.position.y = scriptNode.position.y + scriptDim.h + gap;
    }

    // 确保 assets 不与主链中其他节点重叠（检查水平方向）
    if (assetsNode) {
      const assetsDim = dims.get("assets");
      if (assetsDim) {
        const assetsRight = assetsNode.position.x + assetsDim.w;
        const assetsTop = assetsNode.position.y;
        const assetsBottom = assetsTop + assetsDim.h;
        for (const id of chainNodes) {
          if (id === "script") continue;
          const node = oldData.nodes.find((n) => n.id === id);
          const dim = dims.get(id);
          if (!node || !dim) continue;
          const nodeTop = node.position.y;
          const nodeBottom = nodeTop + dim.h;
          // 检查垂直范围是否有交集
          const vertOverlap = assetsTop < nodeBottom && assetsBottom > nodeTop;
          if (vertOverlap && node.position.x < assetsRight) {
            // 将该节点及其后续都右移
            const shift = assetsRight + gap - node.position.x;
            const idx = chainNodes.indexOf(id);
            for (let i = idx; i < chainNodes.length; i++) {
              const shiftNode = oldData.nodes.find((n) => n.id === chainNodes[i]);
              if (shiftNode) shiftNode.position.x += shift;
            }
            break;
          }
        }
      }
    }
  } else {
    // TB 方向使用 dagre 自动布局
    const widths = [...dims.values()].map((d) => d.w);
    const heights = [...dims.values()].map((d) => d.h);
    const avgWidth = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 150;
    const avgHeight = heights.length ? heights.reduce((a, b) => a + b, 0) / heights.length : 50;
    const ranksep = avgHeight * 0.5 + gap;
    const nodesep = avgWidth * 0.3 + gap;
    oldData.nodes = layout(oldData.nodes, oldData.edges, direction, nodesep, ranksep);
  }

  await fromObject(oldData);
  await nextTick();

  // 布局后同步新位置到 nodePositions，防止后续 flowData 变化时回跳
  for (const node of getNodes.value) {
    nodePositions.value[node.id] = { x: node.position.x, y: node.position.y };
  }

  fitView({ duration: 300 });
}

const title = computed(() => {
  const episode = episodesOptions.value.find((option) => option.value === episodesId.value);
  return episode ? episode.label : "";
});

watch(
  () => episodesId.value,
  async (newVal) => {
    if (!newVal || newVal < 0) return;
    await refFlowData();
    productionAgentStore().updateContext();
    await productionAgentStore().getHistory();
  },
);

async function refFlowData() {
  await productionAgentStore().getFlowData();
  layoutGraph();
}

const current = useLocalStorage("productionCurrent", 0);
const steps = [
  {
    element: ".episodesSelect",
    title: $t("workbench.production.guideSwitchEpisode"),
    body: $t("workbench.production.guideSwitchEpisodeBody"),
    placement: "bottom",
  },
  {
    element: ".guide-refresh-btn",
    title: $t("workbench.production.guideRefresh"),
    body: $t("workbench.production.guideRefreshBody"),
    placement: "bottom",
  },
  {
    element: ".guide-layout-btn",
    title: $t("workbench.production.guideLayoutBtn"),
    body: $t("workbench.production.guideLayoutBtnBody"),
    placement: "bottom",
  },
  {
    element: ".vue-flow__controls",
    title: $t("workbench.production.guideCanvasNav"),
    body: $t("workbench.production.guideCanvasNavBody"),
    placement: "right",
  },
] as any;

const fps = ref(0);
let lastFrameTime = performance.now();
let frameCount = 0;
function animate() {
  const now = performance.now();
  frameCount++;
  const elapsed = now - lastFrameTime;
  if (elapsed >= 500) {
    fps.value = Math.round((frameCount * 1000) / elapsed);
    frameCount = 0;
    lastFrameTime = now;
  }
  if (!openShowVisible.value) {
    requestAnimationFrame(animate);
  }
}

watch(openShowVisible, (val) => {
  if (!val) {
    animate();
  }
});
</script>
<style lang="scss" scoped>
.flowMain {
  height: 100%;
  &.space-dragging {
    cursor: grab !important;
    :deep(*) {
      cursor: grab !important;
    }
  }
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
          background-color: var(--td-bg-color-container-hover);
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
      background-color: var(--td-bg-color-secondarycontainer);
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
// 拖拽/平移时优化渲染性能
.flowMain.is-interacting {
  :deep(.vue-flow__node) {
    will-change: transform;
    contain: layout style paint;
  }
  :deep(.vue-flow__transformationpane) {
    will-change: transform;
  }
  :deep(.t-image),
  :deep(.assetImage),
  :deep(.frameImg),
  :deep(.assetImageWrap) {
    pointer-events: none;
    contain: strict;
  }
  // 禁用 hover 效果，减少样式重算
  :deep(.imageToolsWrap),
  :deep(.addBetween) {
    display: none !important;
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
.fps {
  position: absolute;
  bottom: 10px;
  right: 0px;
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
}
</style>
