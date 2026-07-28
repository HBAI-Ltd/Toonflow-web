<template>
  <div class="modeMenu">
    <div class="left f ac">
      <div class="model">
        <modelSelect v-model="modelParmas.model" type="video" size="small" />
      </div>
      <t-select size="small" class="mode" :value="modelParmas.mode" :onChange="handleBeforeChange">
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
          <t-tag class="btn" variant="outline">{{ modelParmas.resolution }}·{{ modelParmas.duration }}s</t-tag>
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
                    :class="{ active: modelParmas.duration == dur }"
                    @click="updateDuration(dur)">
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
import axios from "@/utils/axios";

const props = defineProps<{
  modeOptions: VideoModel;
  modeList: { value: string; label: string }[];
  trackId: number | undefined;
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
function handleBeforeChange(newVal: unknown) {
  emit("modeChange", newVal);
}
function updateDuration(newDuration: number) {
  modelParmas.value.duration = newDuration;
  if (props.trackId) axios.post("/production/workbench/updateVideoDuration", { id: props.trackId, duration: newDuration });
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
<style lang="scss">
.resolutionDurationPicker {
  min-width: 240px;
  .pickerSection {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .pickerLabel {
      font-size: 13px;
      font-weight: 600;
      color: var(--td-text-color-primary);
      margin-bottom: 10px;
    }

    .pickerOptions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;

      .pickerOption {
        padding: 6px 0;
        border-radius: 8px;
        border: 1.5px solid var(--td-border-level-1-color);
        font-size: 13px;
        color: var(--td-text-color-primary);
        cursor: pointer;
        transition: all 0.15s;
        user-select: none;
        text-align: center;
        background: var(--td-bg-color-container);

        &:hover {
          border-color: var(--td-border-level-2-color);
        }

        &.active {
          border-color: var(--td-text-color-primary);
          color: var(--td-text-color-primary);
          font-weight: 500;
        }
      }
    }
  }
}
</style>
