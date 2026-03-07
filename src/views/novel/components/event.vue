<template>
  <div class="event">
    <t-button>
      <template #icon>
        <i-flash-payment theme="outline" />
      </template>
      重新生成事件
    </t-button>
    <div class="data"></div>
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.event {
  margin-top: 20px;
  .data {
    margin-top: 10px;
  }
}
</style>
