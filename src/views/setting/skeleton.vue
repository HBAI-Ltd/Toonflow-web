<template>
  <div class="skeleton">
    <div class="titleBox">
      <span class="title">{{ props.title }}</span>
    </div>
    <div class="box">
      <slot></slot>
    </div>
  </div>
  <t-divider v-if="props.divider"></t-divider>
</template>

<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  divider: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss" scoped>
.skeleton {
  width: 100%;
  display: flex;
  .titleBox {
    width: 10%;
    .title {
      font-weight: 600;
      font-size: 1rem;
    }
  }
  .box {
    width: 90%;
  }
}
</style>
