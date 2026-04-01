<template>
  <BaseEdge :id="id" :path="path[0]" :label-x="path[1]" :label-y="path[2]" label-bg-style="fill: whitesmoke" />
  <EdgeLabelRenderer>
    <div
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${path[1]}px,${path[2]}px)`,
      }">
      <div class="remove c">
        <i-close theme="outline" size="32" @click="remove(id)" />
      </div>
    </div>
  </EdgeLabelRenderer>
</template>
<script setup>
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from "@vue-flow/core";
const { removeEdges } = useVueFlow("editImage");

const props = defineProps([
  "id",
  "sourceX",
  "sourceY",
  "targetX",
  "targetY",
  "sourcePosition",
  "targetPosition",
  "sourceNode",
  "targetNode",
  "source",
  "target",
  "type",
  "updatable",
  "data",
  "markerEnd",
  "markerStart",
  "style",
  "selected",
  "animated",
  "label",
  "labelStyle",
  "labelShowBg",
  "labelBgStyle",
  "labelBgPadding",
  "labelBgBorderRadius",
  "events",
  "sourceHandleId",
  "targetHandleId",
  "interactionWidth",
]);
const path = computed(() => getBezierPath(props));

function remove(id) {
  removeEdges(id);
}
</script>

<style lang="scss" scoped>
.remove {
  cursor: pointer;
  &:hover {
    color: red !important;
  }
}
</style>
