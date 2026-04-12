<template>
  <div class="modeMenu">
    <div class="left f ac">
      <div class="model">
        <modelSelect v-model="modelParmas.model" type="video" size="small" />
      </div>
      <t-select size="small" class="mode" v-model="modelParmas.mode" :onChange="changeModel">
        <t-option v-for="(item, index) in modeList" :key="index" :value="item.value" :label="item.label"></t-option>
      </t-select>
      <t-button
        size="small"
        variant="outline"
        :theme="modelParmas.audio ? 'success' : 'danger'"
        class="audio"
        @click="modelParmas.audio = !modelParmas.audio">
        <template #icon>
          <i-volume-notice v-if="modelParmas.audio" size="16" />
          <i-volume-mute v-else size="16" />
        </template>
      </t-button>
      <div class="status">
        <t-popup
          trigger="click"
          placement="top"
          overlay-class-name="resDurPickerPopup"
          :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
          <t-tag class="btn" variant="outline">{{ modelParmas.resolution }}·{{ effectiveDuration }}s</t-tag>
          <template #content>
            <div class="resolutionDurationPicker">
              <div
                v-if="
                  Array.isArray(modeOptions.durationResolutionMap) &&
                  modeOptions.durationResolutionMap.length > 0 &&
                  modeOptions.durationResolutionMap[0].resolution &&
                  modeOptions.durationResolutionMap[0].resolution.length > 0
                "
                class="pickerSection">
                <div class="pickerLabel">{{ $t("workbench.generate.resolution") }}</div>
                <div class="pickerOptions">
                  <div
                    v-for="res in modeOptions.durationResolutionMap[0].resolution"
                    :key="res"
                    class="pickerOption"
                    :class="{ active: modelParmas.resolution == res }"
                    @click="modelParmas.resolution = res">
                    {{ res }}
                  </div>
                </div>
              </div>
              <div
                v-if="
                  Array.isArray(modeOptions.durationResolutionMap) &&
                  modeOptions.durationResolutionMap.length > 0 &&
                  modeOptions.durationResolutionMap[0].duration &&
                  modeOptions.durationResolutionMap[0].duration.length > 0
                "
                class="pickerSection">
                <div class="pickerLabel">{{ $t("workbench.generate.duration") }}</div>
                <div class="pickerOptions">
                  <div
                    v-for="dur in modeOptions.durationResolutionMap[0].duration"
                    :key="dur"
                    class="pickerOption"
                    :class="{ active: effectiveDuration === dur }"
                    @click="modelParmas.duration = dur">
                    {{ dur }}s
                  </div>
                </div>
              </div>
            </div>
          </template>
        </t-popup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/views/production/components/workbench/type/type";

const props = defineProps<{
  modeOptions: VideoModel;
  modeList: { value: string; label: string }[];
  effectiveDuration: number;
}>();
const modelParmas = defineModel<ModelSetting>({
  default: {
    mode: "",
    model: "",
    resolution: "480p",
    duration: 8,
    audio: false,
  },
});
const emit = defineEmits(["modeChange"]);
function changeModel() {
  emit("modeChange");
}
</script>

<style lang="scss" scoped>
.modeMenu {
  width: 100%;
  .left {
    flex: 1;
    gap: 8px;
    .mode {
      width: 280px;
    }
    .status {
      .btn {
        cursor: pointer;
        &:hover {
          background-color: var(--td-bg-color-secondarycontainer);
        }
      }
    }
  }
}
</style>
