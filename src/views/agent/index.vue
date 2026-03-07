<template>
  <div class="agent">
    <h2>{{ project?.name }}</h2>
    <div class="data">
      12
    </div>
  </div>
</template>

<script setup lang="ts">
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
</script>

<style lang="scss" scoped></style>
