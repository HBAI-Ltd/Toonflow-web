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
      <i-close-small theme="outline" size="24" fill="#4a4a4a" @click="visible = false" />
    </div>
    <VueFlow id="editStoryboard" class="editStoryboard" :nodes="nodes" :edges="edges" :min-zoom="0.01" fit-view-on-init @connect="onConnect">
      <template #node-upload="{ id, data }">
        <uploadNode :id="id" :data="data" />
      </template>

      <template #node-generated="{ id, data }">
        <generatedNode :id="id" :data="data" />
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
import { VueFlow, useVueFlow, Panel, MarkerType } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import uploadNode from "./uploadNode.vue";
import generatedNode from "./generatedNode.vue";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import removeLine from "./removeLine.vue";

const visible = defineModel("visible", {
  type: Boolean,
  default: false,
});

const { addEdges } = useVueFlow({ id: "editStoryboard" });

// 节点ID计数器
let nodeIdCounter = 3;
// 边ID计数器
let edgeIdCounter = 3;

const nodes = ref([
  {
    id: "upload-1",
    type: "upload",
    position: { x: 100, y: 100 },
    data: {
      image: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    },
  },
  {
    id: "upload-2",
    type: "upload",
    position: { x: 100, y: 400 },
    data: {
      image: "https://tdesign.gtimg.com/demo/demo-image-1.png",
    },
  },
  {
    id: "generated-1",
    type: "generated",
    position: { x: 500, y: 200 },
    data: {
      generatedImage: "https://picsum.photos/400/300?random=3",
      references: [{ image: "https://tdesign.gtimg.com/demo/demo-image-1.png" }, { image: "https://tdesign.gtimg.com/demo/demo-image-1.png" }],
      prompt: "将图二左侧的人换成图1",
      model: "banana-pro",
      ratio: "16:9",
      quality: "1K",
      steps: 49,
    },
  },
]);

const edges = ref([
  {
    id: "e-1",
    source: "upload-1",
    target: "generated-1",
    type: "removeLine",
    animated: true,
    style: { stroke: "#a3e635" },
  },
  {
    id: "e-2",
    source: "upload-2",
    target: "generated-1",
    type: "removeLine",
    animated: true,
    style: { stroke: "#a3e635" },
  },
]);

// 连接处理
const onConnect = (params: any) => {
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
};
function clickHandler(value: any) {
  const type = value.value === 1 ? "upload" : "generated";
  addUploadNode(type);
}
// 添加新的上传节点
const addUploadNode = (type: string) => {
  let newNodeId;
  if (type === "generated") {
    newNodeId = `generated-${nodeIdCounter++}`;
  } else {
    newNodeId = `upload-${nodeIdCounter++}`;
  }
  const lastUploadNode = nodes.value.filter((n) => n.type === "upload").pop();
  const newY = lastUploadNode ? lastUploadNode.position.y + 350 : 100;

  nodes.value.push({
    id: newNodeId,
    type: type,
    position: { x: 100, y: newY },
    data: {
      image: `https://picsum.photos/300/200?random=${nodeIdCounter}`,
    },
  });
};
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
