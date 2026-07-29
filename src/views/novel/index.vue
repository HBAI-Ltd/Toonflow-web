<template>
  <SourceFoundationWorkbench v-if="project?.pipelineMode === 'xianxia'" />
  <LegacyNovelWorkbench v-else />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import projectStore from "@/stores/project";
import LegacyNovelWorkbench from "./LegacyNovelWorkbench.vue";
import SourceFoundationWorkbench from "./sourceFoundation/SourceFoundationWorkbench.vue";

const { project } = storeToRefs(projectStore());
</script>
