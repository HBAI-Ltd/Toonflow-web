<template>
  <div class="otherConfig">
    <t-form label-align="top">
      <t-alert theme="warning">{{ $t('settings.dev.warning') }}</t-alert>
      <t-form-item :label="$t('settings.dev.devtool')" name="showTitleBar">
        <t-button theme="primary" @click="openDevTool">{{ $t('settings.dev.openDevtool')}}</t-button>
      </t-form-item>
      <t-form-item :label="$t('settings.dev.aiDevtool')" name="showTitleBar">
        <t-switch v-model="isElectron" @change="getSwitchAiDevTool"/>
      </t-form-item>
      <t-form-item v-show="isElectron" :label="$t('settings.dev.switchAiDevTool')" name="showTitleBar">
        <t-switch :customValue="['1', '0']" v-model="switchAiDevTool" @change="updateSwitchAiDevTool" />
        <template #tips>
          <p>{{ $t('settings.dev.devtoolsDoc') }}：https://ai-sdk.dev/docs/ai-sdk-core/devtools</p>
          <p>{{ $t('settings.dev.devtoolsDesc') }}</p>
          <p>{{ $t('settings.dev.devtoolsDesc2')}}</p>
        </template>
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import settingStore from "@/stores/setting";
const { isElectron } = storeToRefs(settingStore());

const switchAiDevTool = ref("0");

function openDevTool() {
  if (isElectron.value) {
    try {
      fetch("toonflow://openDevTool");
    } catch (error) {
      window.$message?.warning("$t('settings.dev.openDevtoolFailed')");
    }
  } else {
    window.$message?.warning("$t('settings.dev.notInElectron')");
  }
}

async function getSwitchAiDevTool() {
  const { data } = await axios.get("/setting/dev/getSwitchAiDevTool");
  switchAiDevTool.value = data?.switchAiDevTool || "0";
}

function updateSwitchAiDevTool() {
  axios.post("/setting/dev/updateSwitchAiDevTool", { switchAiDevTool: switchAiDevTool.value });
}
onMounted(() => {
  getSwitchAiDevTool();
});
</script>

<style lang="scss" scoped>
.otherConfig {
  width: 100%;
}
</style>
