<template>
  <t-dialog
    :footer="false"
    :header="false"
    :closeBtn="false"
    v-model:visible="visible"
    attach="body"
    width="80vw"
    placement="center"
    class="fullscreenDialog">
    <div class="closure">
      <i-close-small theme="outline" size="24" fill="#4a4a4a" @click="closeFn" />
    </div>
    <VueFlow
      id="editStoryboard"
      class="editStoryboard"
      v-model:nodes="nodes"
      v-model:edges="edges"
      :min-zoom="0.01"
      fit-view-on-init
      @connect="onConnect"
      @edges-change="syncReferences">
      <template #node-upload="{ id, data }">
        <uploadNode :id="id" :data="data" @upload="syncReferences" />
      </template>

      <template #node-generated="{ id, data }">
        <generatedNode :id="id" :data="data" :projectId="projectId" :type="props.type" @keep="sureNode" />
      </template>
      <template #edge-removeLine="edgeProps">
        <removeLine v-bind="edgeProps" />
      </template>
      <Background></Background>
      <Controls />

      <Panel position="top-right">
        <t-dropdown
          :options="[
            { content: '上传', value: 1 },
            { content: '生成', value: 2 },
          ]"
          @click="clickHandler">
          <t-button theme="primary" shape="circle">
            <template #icon><i-plus /></template>
          </t-button>
        </t-dropdown>
      </Panel>
    </VueFlow>
  </t-dialog>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow, Panel, MarkerType, type Edge } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import uploadNode from "./uploadNode.vue";
import generatedNode from "./generatedNode.vue";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import removeLine from "./removeLine.vue";
import store from "@/stores";
import axios from "@/utils/axios";
import type { NodeType } from "../../utils/editImageType";
import { flow } from "lodash";
const { projectId } = storeToRefs(store());
const props = defineProps<{
  editData: {
    images: string[];
    id?: number | null;
  };
  type?: string;
}>();

const emit = defineEmits(["save"]);

const visible = defineModel("visible", {
  type: Boolean,
  default: false,
});
const { addEdges, getNodes, getEdges, updateNodeData } = useVueFlow({ id: "editStoryboard" });

// 节点ID计数器
let nodeIdCounter = 3;
// 边ID计数器
let edgeIdCounter = 3;

const nodes = ref<NodeType[]>([]);
const edges = ref<Edge<any, any, string>[]>([]);

const flowId = ref<number | null>(null);

// 防抖定时器
let syncTimer: ReturnType<typeof setTimeout> | null = null;

// 根据当前连线，将 upload 节点的图片同步到 generated 节点的 references
function syncReferences() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(_doSyncReferences, 60);
}

function _doSyncReferences() {
  const allNodes = getNodes.value;
  const allEdges = getEdges.value;

  // 用 Map 预索引节点，避免重复 find（O(n) → O(1)）
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // 按 target 分组 edges，减少重复遍历
  const edgesByTarget = new Map<string, string[]>();
  for (const e of allEdges) {
    const list = edgesByTarget.get(e.target);
    if (list) list.push(e.source);
    else edgesByTarget.set(e.target, [e.source]);
  }

  // 找出所有 generated 节点并同步 references
  for (const genNode of allNodes) {
    if (genNode.type !== "generated") continue;

    const sourceIds = edgesByTarget.get(genNode.id) ?? [];
    const connectedImages = sourceIds
      .map((id) => nodeMap.get(id))
      .filter((n) => n?.type === "upload")
      .map((n) => ({ image: (n!.data as { image?: string }).image || "" }))
      .filter((i) => i.image);

    // 仅在数据变化时才更新，避免无效的响应式触发
    const currentRefs: { image: string }[] = (genNode.data as any).references ?? [];
    const isSame = currentRefs.length === connectedImages.length && connectedImages.every((img, idx) => currentRefs[idx]?.image === img.image);
    if (!isSame) {
      updateNodeData(genNode.id, { references: connectedImages });
    }
  }
}

// 连接处理
const onConnect = (params: any) => {
  // 禁止重复连线：同一 source → target 已存在则忽略
  const isDuplicate = getEdges.value.some((e) => e.source === params.source && e.target === params.target);
  if (isDuplicate) return;

  // 禁止同类节点连接
  const allNodes = getNodes.value;
  const sourceNode = allNodes.find((n) => n.id === params.source);
  const targetNode = allNodes.find((n) => n.id === params.target);
  if (sourceNode && targetNode && sourceNode.type === targetNode.type) return;

  addEdges([
    {
      id: `e-${edgeIdCounter++}`,
      source: params.source,
      target: params.target,
      type: "removeLine",
      animated: true,
      style: { stroke: "#a3e635" },
    },
  ]);
  // 连线建立后立即同步
  nextTick(syncReferences);
};
function clickHandler(value: any) {
  const type = value.value === 1 ? "upload" : "generated";
  addUploadNode(type);
}
// 添加新的上传节点
const addUploadNode = (type: string, image: string = "") => {
  let newNodeId;
  if (type === "generated") {
    newNodeId = `generated-${nodeIdCounter++}`;
  } else {
    newNodeId = `upload-${nodeIdCounter++}`;
  }
  const lastUploadNode = nodes.value.filter((n) => n.type === "upload").pop();
  const newY = lastUploadNode ? lastUploadNode.position.y + 350 : 100;
  const refeceImage = {
    generatedImage: "",
    references: image ? [image] : [],
    prompt: "",
    model: "",
    ratio: "",
    quality: "",
    steps: 49,
  };
  const newNodeObj = {
    id: newNodeId,
    type: type,
    position: { x: 100, y: newY },
    data: {
      ...(type == "generated" ? { ...refeceImage } : { image: image }),
    },
  };

  nodes.value.push(newNodeObj as NodeType);
};
//保存节点
async function sureNode(imageUrl: string = "") {
  try {
    const id = props.editData?.id;
    let insertId = "";
    if (flowId.value) {
      await axios.post("/production/editImage/updateImageFlow", {
        id: id,
        flowId: flowId.value,
        nodes: nodes.value,
        edges: edges.value,
        imageUrl,
        type: props.type,
      });
    } else {
      const { data } = await axios.post("/production/editImage/saveImageFlow", {
        id: id,
        nodes: nodes.value,
        edges: edges.value,
        imageUrl,
        type: props.type,
      });
      insertId = data?.id || null;
    }
    emit("save", { imageUrl, insertId });
    visible.value = false;
  } catch (e) {
    window.$message.error((e as any).message || "保存失败");
  } finally {
  }
}
onMounted(async () => {
  try {
    if (!props.editData?.id) return buildFlow();
    const { data } = await axios.post("/production/editImage/getImageFlow", {
      id: props.editData?.id,
      type: props.type,
    });
    if (!data) return buildFlow();
    edges.value = data.edges;
    nodes.value = data.nodes;
    flowId.value = data.id;
  } catch (e) {
    window.$message.error((e as any).message || "获取数据失败");
  }
});

function buildFlow() {
  props.editData.images.forEach((i) => {
    addUploadNode("upload", i);
  });
}

function closeFn() {
  try {
    sureNode("");
  } catch (e) {
    visible.value = false;
  }
}
</script>

<style lang="scss" scoped>
.fullscreenDialog {
  .closure {
    position: absolute;
    top: var(--td-comp-paddingTB-xl);
    right: var(--td-comp-paddingLR-xxl);
    z-index: 9999;
    cursor: pointer;
  }
  .editStoryboard {
    width: 100%;
    height: 75vh;
  }
}

:deep(.fullscreenDialog) {
  .t-dialog__header {
    display: none !important;
  }
  .t-dialog__body {
    padding: 0 !important;
  }
  .t-dialog__wrap {
    padding: 0 !important;
  }
}
</style>
