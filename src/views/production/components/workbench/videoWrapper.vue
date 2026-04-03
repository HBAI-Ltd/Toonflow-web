<template>
  <div class="videoWrapper ac c">
    <video
      v-if="selectedData?.videoUrl"
      ref="previewVideoRef"
      :src="selectedData.videoUrl"
      :poster="selectedData.imageUrl"
      class="previewVideo"
      controls
      preload="metadata" />
    <img v-else-if="selectedData?.imageUrl" :src="selectedData.imageUrl" class="previewVideo" />
    <div v-else class="placeholderImage">
      <i-pic size="48" fill="#999" />
      <span>{{ $t("workbench.production.generate.noVideo") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const selectedData = ref({
  videoUrl: "",
  imageUrl: "",
});
</script>

<style lang="scss" scoped>
.videoWrapper {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  .previewVideo {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .placeholderImage {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    color: #999;
    font-size: 14px;
  }
}
</style>
