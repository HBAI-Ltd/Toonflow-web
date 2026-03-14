<template>
  <div class="floatingTaskBox">
    <div class="box">
      <agent v-model="openShowVisible" />
    </div>
  </div>
</template>

<script setup lang="ts">
import agent from "@/components/agent/index.vue";
const openShowVisible = defineModel({
  type: Boolean,
  default: false,
});
</script>

<style lang="scss" scoped>
.floatingTaskBox {
  position: absolute;
  top: 10px;
  right: 0;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  .box {
    width: 500px;
    height: 100%;
    border-radius: 10px;
    border: 1px solid #919191;
    background-color: #fff;
    overflow-y: auto;
  }
}
</style>
