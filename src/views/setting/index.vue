<template>
  <div class="setting">
    <h1>设置</h1>
    <skeleton title="主题" divider>
      <themeConfig />
    </skeleton>
    <skeleton title="请求地址配置" divider>
      <requestConfig />
    </skeleton>
    <skeleton title="登录配置" divider>
      <loginConfig />
    </skeleton>
    <skeleton title="语言模型配置" divider>
      <aiConfog />
    </skeleton>
    <skeleton title="视频模型配置" divider>
      <videoModelConfig />
    </skeleton>
    <skeleton title="提示词配置" divider>
      <promptsEdit />
    </skeleton>
    <skeleton title="其他配置" divider>
      <otherConfig />
    </skeleton>
    <skeleton title="数据库操作" divider>
      <dbConfig />
    </skeleton>
    <skeleton title="关于" divider>
      <about />
    </skeleton>
    <skeleton title="退出登录" divider>
      <logoutConfig />
    </skeleton>
  </div>
</template>

<script setup lang="ts">
import skeleton from "./skeleton.vue";
import themeConfig from "./components/themeConfig.vue";
import requestConfig from "./components/requestConfig.vue";
import loginConfig from "./components/loginConfig.vue";
import aiConfog from "./components/aiConfog.vue";
import videoModelConfig from "./components/videoModelConfig.vue";
import promptsEdit from "./components/promptsEdit.vue";
import dbConfig from "./components/dbConfig.vue";
import otherConfig from "./components/otherConfig.vue";
import about from "./components/about.vue";
import logoutConfig from "./components/logoutConfig.vue";
</script>

<style lang="scss" scoped>
.setting {
  padding-left: 5rem;
  padding-right: 5rem;
  width: 100%;
  height: 100%;
}
</style>
