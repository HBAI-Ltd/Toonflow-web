<template>
  <div class="modeMenu">
    <div class="left f ac">
      <div class="model">
        <modelSelect v-model="selectModel" type="video" size="small" />
      </div>
      <t-select size="small" class="mode" v-model="selectMode">
        <t-option v-for="(item, index) in modeList" :key="index" :value="item.value" :label="item.label"></t-option>
      </t-select>
      <t-button
        size="small"
        variant="outline"
        :theme="selectedAudio ? 'success' : 'danger'"
        class="audio"
        @click="selectedAudio = !selectedAudio">
        <template #icon>
          <i-volume-notice v-if="selectedAudio" size="16" />
          <i-volume-mute v-else size="16" />
        </template>
      </t-button>
      <div class="status">
        <t-popup
          trigger="click"
          placement="top"
          overlay-class-name="resDurPickerPopup"
          :overlay-inner-style="{ padding: '16px', borderRadius: '8px' }">
          <t-tag class="btn" variant="outline">{{ selectedResolution }}·{{ effectiveDuration }}s</t-tag>
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
                    :class="{ active: selectedResolution === res }"
                    @click="selectedResolution = res">
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
                    @click="selectedDuration = dur">
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

const selectModel = defineModel<string | undefined>("selectModel");
const selectMode = defineModel<string | undefined>("selectMode");
const selectedResolution = defineModel<string>("selectedResolution", { required: true });
const selectedDuration = defineModel<number>("selectedDuration", { required: true });
const selectedAudio = defineModel<boolean>("selectedAudio", { required: true });
</script>

<style lang="scss" scoped>
.modeMenu {
  width: 100%;
  .left {
    flex: 1;
    gap: 8px;
    .mode {
      width: 180px;
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
