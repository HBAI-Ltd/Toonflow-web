<template>
  <div class="source-foundation-workbench">
    <SourceStepHeader v-model="store.activeStep" :overview="store.overview" />
    <component :is="activeComponent" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import projectStore from "@/stores/project";
import { useSourceFoundationStore } from "@/stores/sourceFoundation";
import EpisodeCatalogStep from "./EpisodeCatalogStep.vue";
import FactRegistryStep from "./FactRegistryStep.vue";
import SourceBatchStep from "./SourceBatchStep.vue";
import SourceStepHeader from "./SourceStepHeader.vue";
import SourcePackageStep from "./SourcePackageStep.vue";

const projectId = Number(projectStore().project?.id);
const store = useSourceFoundationStore(projectId);
const stepComponents = [SourceBatchStep, FactRegistryStep, EpisodeCatalogStep, SourcePackageStep];
const activeComponent = computed(() => stepComponents[store.activeStep - 1]);

onMounted(() => store.pollWhileActive());
onUnmounted(() => store.stopPolling());
</script>
