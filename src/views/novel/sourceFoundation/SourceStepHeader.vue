<template>
  <div class="source-step-header">
    <t-steps :current="modelValue" @change="onChange">
      <t-step-item :title="$t('workbench.sourceFoundation.steps.source')" />
      <t-step-item :title="$t('workbench.sourceFoundation.steps.facts')" />
      <t-step-item :title="$t('workbench.sourceFoundation.steps.catalog')" />
      <t-step-item :title="$t('workbench.sourceFoundation.steps.package')" />
    </t-steps>
  </div>
</template>

<script setup lang="ts">
import type { SourceFoundationOverview } from "@/types/sourceFoundation";

defineProps<{
  modelValue: number;
  overview: SourceFoundationOverview | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: number): void;
}>();

function onChange(current: string | number) {
  emit("update:modelValue", Number(current));
}
</script>

<style lang="scss" scoped>
.source-step-header {
  margin-bottom: 16px;
}
</style>
