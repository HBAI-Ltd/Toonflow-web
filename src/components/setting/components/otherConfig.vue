<template>
  <div class="otherConfig">
    <t-form label-align="top">
      <t-form-item name="chapterReg">
        <template #label>
          <span>{{ $t("settings.other.chapterRegex") }}</span>
          <t-button style="margin-left: 15px" @click="setDefaultReg" size="small">{{ $t("settings.other.restoreDefault") }}</t-button>
        </template>
        <t-textarea v-model="otherSetting.chapterReg" :placeholder="$t('settings.other.regexPlaceholder')" style="width: 400px" />
      </t-form-item>
      <t-form-item :label="$t('settings.other.requestTimeout')" name="axiosTimeOut">
        <t-input-number
          auto-width
          :suffix="$t('settings.other.seconds')"
          :min="10"
          v-model="axiosTimeOutInSeconds"
          :allowInputOverLimit="false"
          :placeholder="$t('settings.other.inputSeconds')" />
      </t-form-item>
      <t-form-item :label="$t('settings.other.agentCanvasScalingMethod')">
        <t-radio-group variant="default-filled" v-model="canvasWheelEvent">
          <t-radio-button value="zoom">{{ $t("settings.other.zoom") }}</t-radio-button>
          <t-radio-button value="scroll">{{ $t("settings.other.scroll") }}</t-radio-button>
        </t-radio-group>
      </t-form-item>
      <t-form-item :label="$t('settings.other.isInteracting')">
        <t-radio-group variant="default-filled" v-model="otherSetting.interacting">
          <t-radio-button :value="false">{{ $t("settings.other.closeIsInteracting") }}</t-radio-button>
          <t-radio-button :value="true">{{ $t("settings.other.openIsInteracting") }}</t-radio-button>
        </t-radio-group>
      </t-form-item>
      <t-form-item :label="$t('settings.other.assetConcurrency')" name="assetsBatchGenereateSize">
        <t-input-number
          auto-width
          :suffix="$t('settings.other.count')"
          :min="1"
          v-model="otherSetting.assetsBatchGenereateSize"
          :allowInputOverLimit="false"
          :placeholder="$t('settings.other.inputCount')" />
      </t-form-item>
    </t-form>
  </div>
</template>

<script setup lang="ts">
import settingStore from "@/stores/setting";
const { otherSetting, canvasWheelEvent } = storeToRefs(settingStore());

import { computed } from "vue";
// 将毫秒转换为秒显示，输入时转换回毫秒存储
const axiosTimeOutInSeconds = computed({
  get: () => {
    const ms = otherSetting.value.axiosTimeOut;
    if (ms == null || isNaN(ms)) return 600; // 默认600秒
    return Math.floor(ms / 1000);
  },
  set: (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return;
    otherSetting.value.axiosTimeOut = val * 1000;
  },
});

function setDefaultReg() {
  otherSetting.value.chapterReg = "/第\\s*([0-9０-９零一二三四五六七八九十百千万]+)\\s*[章回节]\\s*([^\\n\\r]*)/g";
}
</script>

<style lang="scss" scoped>
.otherConfig {
  width: 100%;
}
</style>
