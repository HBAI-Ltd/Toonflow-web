<template>
  <div class="generateContainer">
    <div class="data f">
      <div class="videoToImage">
        <videoWrapper />
      </div>
      <div class="configurationParameters">
        <t-card bordered>
          <t-form :labelWidth="100" labelAlign="top">
            <t-form-item name="name">
              <template #label>
                <div class="jb">
                  <div>
                    {{ $t("workbench.production.generate.videoPrompt") }}
                  </div>
                  12
                </div>
              </template>
            </t-form-item>
          </t-form>
        </t-card>
      </div>
    </div>
    <div class="videoTrack">
      <t-card bordered :style="{ height: '100%' }">23</t-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import videoWrapper from "./videoWrapper.vue";
//当前选中的分镜或者视频
const selectedData = ref<{ id: number; videoUrl: string; imageUrl: string }>();
</script>

<style lang="scss" scoped>
.generateContainer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  gap: 16px;
  .data {
    width: 100%;
    height: 80%;
    gap: 10px;
    min-height: 0;
    .videoToImage {
      width: 50%;
      height: 100%;
      display: flex;
      flex: 1;
      gap: 24px;
      min-height: 0;
    }
    .configurationParameters {
      width: 50%;
      height: 100%;
      overflow-y: auto;
    }
  }
  .videoTrack {
    width: 100%;
    height: 20%;
    margin-top: 10px;
  }
}
</style>
