<template>
  <div class="">
    <t-button @click="test">test</t-button>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";

function test() {
  axios.get("/test/test").then((res) => {
    console.log(res);
  });
}
</script>

<style lang="scss" scoped></style>
