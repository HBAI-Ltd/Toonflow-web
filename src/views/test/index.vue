<template>
  <div class="test">
    <t-button theme="primary" @click="test">测试按钮</t-button>
    <pre>
      {{ log }}
    </pre>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
const log = ref<any>("");
function test() {
  axios.get("/test/test").then((res) => {
    log.value = res;
  });
}
</script>

<style lang="scss" scoped></style>
