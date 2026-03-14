<template>
  <div class="notFound">
    <span class="title">404</span>
    <div class="notFoundText">页面不存在</div>
    <t-button class="notFoundBtn" theme="primary" @click="goHome">返回首页</t-button>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();

function goHome() {
  router.push("/");
}
</script>

<style lang="scss" scoped>
.notFound {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .title {
    font-size: 64px;
    font-weight: bold;
    margin-bottom: 32px;
    color: #d0d0d0;
  }
  .notFoundText {
    font-size: 24px;
    margin-bottom: 24px;
    font-weight: 500;
    color: #333;
  }
}
</style>
