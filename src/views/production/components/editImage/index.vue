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
      id="editImage"
      class="editImage"
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
        <div class="ac" style="gap: 8px">
          <t-tooltip theme="primary" content="自动排版-左右布局">
            <div class="item c" @click="layoutGraph('LR')">
              <i-tree-diagram theme="outline" size="24" />
            </div>
          </t-tooltip>
          <t-tooltip theme="primary" content="自动排版-上下布局">
            <div class="item c" @click="layoutGraph('TB')">
              <i-branch-one theme="outline" size="24" />
            </div>
          </t-tooltip>
          <t-dropdown
            :options="[
              { content: $t('workbench.production.editImage.upload'), value: 1 },
              { content: $t('workbench.production.editImage.generate'), value: 2 },
            ]"
            @click="clickHandler">
            <t-button theme="primary" shape="circle">
              <template #icon><i-plus /></template>
            </t-button>
          </t-dropdown>
        </div>
      </Panel>
    </VueFlow>
  </t-dialog>
  <Teleport to="body">
    <storyboardImageCheck
      v-model="storyboardVisible"
      v-if="storyboardVisible"
      :scriptId="episodesId!"
      @confirm="onStoryboardConfirm"
      @cancel="onStoryboardCancel"
    />
  </Teleport>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { VueFlow, useVueFlow, Panel, type Edge } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import uploadNode from "./uploadNode.vue";
import generatedNode from "./generatedNode.vue";
import storyboardImageCheck from "@/components/storyboardImageCheck.vue";
import type { Storyboard } from "../../utils/flowBuilder";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import removeLine from "./removeLine.vue";
import store from "@/stores";
import axios from "@/utils/axios";
import type { NodeType, UploadNodeData, GeneratedNodeData } from "../../utils/editImageType";
import { DEFAULT_EDGE_OPTIONS, createGeneratedData, cleanNodes, cleanEdges } from "../../utils/editImageType";
import { useLayout } from "../../utils/dagre";
import { v4 as uuid } from "uuid";

const episodesId = inject<Ref<number>>("episodesId");

// ---- storyboardImageCheck 统一管理 ----
const storyboardVisible = ref(false);
let storyboardResolve: ((rows: Storyboard[]) => void) | null = null;

function openStoryboardCheck(): Promise<Storyboard[]> {
  storyboardVisible.value = true;
  return new Promise<Storyboard[]>((resolve) => {
    storyboardResolve = resolve;
  });
}

function onStoryboardConfirm(rows: Storyboard[]) {
  storyboardVisible.value = false;
  storyboardResolve?.(rows);
  storyboardResolve = null;
}

function onStoryboardCancel() {
  storyboardVisible.value = false;
  storyboardResolve?.([]);
  storyboardResolve = null;
}

provide("openStoryboardCheck", openStoryboardCheck);

const { toObject, fromObject, fitView } = useVueFlow({ id: "editImage" });
const { layout } = useLayout("editImage");

const { projectId } = storeToRefs(store());
const props = defineProps<{
  editData: {
    resultImages: { src: string; prompt: string }[];
    referanceImages: string[];
    id?: number | null;
  };
  type?: string;
}>();

const emit = defineEmits(["save"]);

const visible = defineModel("visible", {
  type: Boolean,
  default: false,
});
const { addEdges, getNodes, getEdges, updateNodeData } = useVueFlow({ id: "editImage" });

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
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((n) => {
        if (n.type === "upload") {
          return { image: (n.data as UploadNodeData).image || "" };
        } else if (n.type === "generated") {
          return { image: (n.data as GeneratedNodeData).generatedImage || "" };
        }
        return { image: "" };
      })
      .filter((i) => i.image);

    // 仅在数据变化时才更新，避免无效的响应式触发
    const currentRefs: { image: string }[] = (genNode.data as GeneratedNodeData).references ?? [];
    const isSame = currentRefs.length === connectedImages.length && connectedImages.every((img, idx) => currentRefs[idx]?.image === img.image);
    if (!isSame) {
      updateNodeData(genNode.id, { references: connectedImages });
    }
  }
}

// 连接处理
const onConnect = (params: any) => {
  // 禁止自己连接自己
  if (params.source === params.target) return;

  // 禁止重复连线及反向连线：A→B 或 B→A 已存在则忽略
  const isDuplicate = getEdges.value.some(
    (e) => (e.source === params.source && e.target === params.target) || (e.source === params.target && e.target === params.source),
  );
  if (isDuplicate) return;

  addEdges([
    {
      id: uuid(),
      source: params.source,
      target: params.target,
      ...DEFAULT_EDGE_OPTIONS,
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
const addUploadNode = (type: string, image: string = "", prompt: string = "") => {
  const newNodeId = uuid();
  const lastNode = nodes.value.filter((n) => n.type === type).pop();
  const newY = lastNode ? lastNode.position.y + 350 : 100;
  const newX = type === "generated" ? 600 : 100;

  nodes.value.push({
    id: newNodeId,
    type,
    position: { x: newX, y: newY },
    data: type === "generated" ? createGeneratedData(image, prompt) : { image },
  } as NodeType);

  return newNodeId;
};
//保存节点
async function sureNode(imageUrl: string = "") {
  try {
    const id = props.editData?.id;
    const payload = {
      id,
      nodes: cleanNodes(getNodes.value as NodeType[]),
      edges: cleanEdges(getEdges.value),
      imageUrl,
      type: props.type,
      episodesId: episodesId!.value,
    };

    let insertId = "";
    if (flowId.value) {
      await axios.post("/production/editImage/updateImageFlow", { ...payload, flowId: flowId.value });
    } else {
      const { data } = await axios.post("/production/editImage/saveImageFlow", payload);
      insertId = data?.id || null;
    }
    emit("save", { imageUrl, insertId });
    visible.value = false;
  } catch (e) {
    window.$message.error((e as any).message || $t("workbench.production.editImage.saveFailed"));
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
    window.$message.error((e as any).message || $t("workbench.production.editImage.fetchFailed"));
  }
});

function buildFlow() {
  const uploadIds: string[] = [];
  const generatedIds: string[] = [];
  props.editData.referanceImages.forEach((i) => {
    uploadIds.push(addUploadNode("upload", i));
  });
  props.editData.resultImages.forEach((i) => {
    generatedIds.push(addUploadNode("generated", i.src, i.prompt));
  });
  // 将每个 upload 节点连接到每个 generated 节点
  for (const sourceId of uploadIds) {
    for (const targetId of generatedIds) {
      edges.value.push({
        id: uuid(),
        source: sourceId,
        target: targetId,
        ...DEFAULT_EDGE_OPTIONS,
      });
    }
  }
  nextTick(syncReferences);
}

function closeFn() {
  sureNode("").finally(() => {
    visible.value = false;
  });
}
async function layoutGraph(direction: "LR" | "TB") {
  const oldData = toObject();
  oldData.nodes = layout(oldData.nodes, oldData.edges, direction);
  await fromObject(oldData);
  await nextTick();
  fitView({ duration: 300 });
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
  .editImage {
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
.item {
  width: 45px;
  padding: 5px;
  color: var(--mainColor);
  &:hover {
    background-color: #f4f4f4;
    border-radius: 4px;
    cursor: pointer;
  }
}
</style>
