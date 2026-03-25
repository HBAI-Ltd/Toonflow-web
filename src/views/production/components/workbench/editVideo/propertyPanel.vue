<template>
  <div class="propertyPanel">
    <div class="panelHeader">
      <h3 class="panelTitle">{{ $t('workbench.production.editVideo.propertyPanel') }}</h3>
    </div>

    <div class="panelContent">
      <div v-if="!selectedClip" class="emptyState">
        <div class="emptyIconWrapper">
          <i-inbox theme="outline" size="32" fill="#999" />
        </div>
        <div class="emptyText">{{ $t('workbench.production.editVideo.selectClip') }}</div>
      </div>

      <div v-else class="properties">
        <!-- 基础信息 -->
        <div class="sectionCard">
          <div class="sectionHeader">
            <div class="sectionIconBadge">
              <component :is="getClipIcon(selectedClip)" theme="outline" size="16" />
            </div>
            <span class="sectionLabel">{{ $t('workbench.production.editVideo.basicInfo') }}</span>
            <t-tag size="small" theme="primary" variant="light">{{ getClipTypeName(selectedClip.type) }}</t-tag>
          </div>
          <div class="sectionBody">
            <div class="propRow">
              <label class="propLabel">{{ $t('workbench.production.editVideo.name') }}</label>
              <t-input v-model="clipName" size="small" :placeholder="$t('workbench.production.editVideo.clipNamePlaceholder')" @change="handleUpdateClip('name', clipName)" />
            </div>
            <div class="propRowInline">
              <div class="propField">
                <label class="propLabel">{{ $t('workbench.production.editVideo.startTime') }}</label>
                <t-input-number
                  :value="Number(selectedClip.startTime.toFixed(2))"
                  size="small"
                  :decimal-places="2"
                  :step="0.01"
                  theme="normal"
                  suffix="s"
                  @change="(val: any) => handleUpdateClip('startTime', Number(val))" />
              </div>
              <div class="propField">
                <label class="propLabel">{{ $t('workbench.production.editVideo.endTime') }}</label>
                <t-input-number
                  :value="Number(selectedClip.endTime.toFixed(2))"
                  size="small"
                  :decimal-places="2"
                  :step="0.01"
                  theme="normal"
                  suffix="s"
                  @change="(val: any) => handleUpdateClip('endTime', Number(val))" />
              </div>
            </div>
            <div class="propRowInline durationRow">
              <span class="durationLabel">{{ $t('workbench.production.editVideo.totalDuration') }}</span>
              <t-tag size="small" theme="default" variant="outline">{{ (selectedClip.endTime - selectedClip.startTime).toFixed(2) }}s</t-tag>
            </div>
          </div>
        </div>

        <!-- 视频属性 -->
        <div v-if="selectedClip.type === 'video'" class="sectionCard">
          <div class="sectionHeader">
            <div class="sectionIconBadge">
              <i-video theme="outline" size="16" />
            </div>
            <span class="sectionLabel">{{ $t('workbench.production.editVideo.videoProperties') }}</span>
          </div>
          <div class="sectionBody">
            <div class="propRow">
              <div class="propRowHead">
                <label class="propLabel">{{ $t('workbench.production.editVideo.opacity') }}</label>
                <span class="propValueText">{{ Math.round(videoOpacity) }}%</span>
              </div>
              <t-slider v-model="videoOpacity" :min="0" :max="100" :step="1" @change="handleUpdateClip('opacity', Math.round(videoOpacity) / 100)" />
            </div>
            <div class="propRow">
              <div class="propRowHead">
                <label class="propLabel">{{ $t('workbench.production.editVideo.volume') }}</label>
                <span class="propValueText">{{ Math.round(videoVolume) }}%</span>
              </div>
              <t-slider v-model="videoVolume" :min="0" :max="200" :step="1" @change="handleUpdateClip('volume', Math.round(videoVolume) / 100)" />
            </div>
            <div class="propRow">
              <label class="propLabel">{{ $t('workbench.production.editVideo.playbackSpeed') }}</label>
              <t-input-number
                v-model="videoSpeed"
                size="small"
                :min="0.1"
                :max="10"
                :step="0.1"
                :decimal-places="1"
                theme="normal"
                suffix="x"
                @change="(val: any) => handleUpdatePlaybackRate(Number(val))" />
            </div>
          </div>
        </div>

        <!-- 音频属性 -->
        <div v-if="selectedClip.type === 'audio'" class="sectionCard">
          <div class="sectionHeader">
            <div class="sectionIconBadge">
              <i-music theme="outline" size="16" />
            </div>
            <span class="sectionLabel">{{ $t('workbench.production.editVideo.audioProperties') }}</span>
          </div>
          <div class="sectionBody">
            <div class="propRow">
              <div class="propRowHead">
                <label class="propLabel">{{ $t('workbench.production.editVideo.volume') }}</label>
                <span class="propValueText">{{ Math.round(audioVolume) }}%</span>
              </div>
              <t-slider v-model="audioVolume" :min="0" :max="200" :step="1" @change="handleUpdateClip('volume', Math.round(audioVolume) / 100)" />
            </div>
            <div class="propRowInline">
              <div class="propField">
                <label class="propLabel">{{ $t('workbench.production.editVideo.fadeIn') }}</label>
                  size="small"
                  :min="0"
                  :step="0.1"
                  :decimal-places="1"
                  theme="normal"
                  suffix="s"
                  @change="handleUpdateClip('fadeIn', audioFadeIn)" />
              </div>
              <div class="propField">
                <label class="propLabel">{{ $t('workbench.production.editVideo.fadeOut') }}</label>
                <t-input-number
                  v-model="audioFadeOut"
                  size="small"
                  :min="0"
                  :step="0.1"
                  :decimal-places="1"
                  theme="normal"
                  suffix="s"
                  @change="handleUpdateClip('fadeOut', audioFadeOut)" />
              </div>
            </div>
          </div>
        </div>

        <!-- 转场属性 -->
        <div v-if="selectedClip.type === 'transition'" class="sectionCard">
          <div class="sectionHeader">
            <div class="sectionIconBadge">
              <i-exchange theme="outline" size="16" />
            </div>
            <span class="sectionLabel">{{ $t('workbench.production.editVideo.transitionProperties') }}</span>
          </div>
          <div class="sectionBody">
            <div class="propRow">
              <label class="propLabel">{{ $t('workbench.production.editVideo.transitionType') }}</label>
              <t-select v-model="transitionType" size="small" @change="handleUpdateClip('transitionType', transitionType)">
                <t-option value="fade" :label="$t('workbench.production.editVideo.transFade')" />
                <t-option value="slide" :label="$t('workbench.production.editVideo.transSlide')" />
                <t-option value="wipe" :label="$t('workbench.production.editVideo.transWipe')" />
                <t-option value="dissolve" :label="$t('workbench.production.editVideo.transDissolve')" />
                <t-option value="zoom" :label="$t('workbench.production.editVideo.transZoom')" />
                <t-option value="rotate" :label="$t('workbench.production.editVideo.transRotate')" />
              </t-select>
            </div>
            <div class="propRow">
              <label class="propLabel">{{ $t('workbench.production.editVideo.transitionDuration') }}</label>
              <t-input-number
                v-model="transitionDuration"
                size="small"
                :min="0.1"
                :max="5"
                :step="0.1"
                :decimal-places="1"
                theme="normal"
                suffix="s"
                @change="handleUpdateTransitionDuration" />
            </div>
          </div>
        </div>

        <!-- 字幕属性 -->
        <div v-if="selectedClip.type === 'subtitle'" class="sectionCard">
          <div class="sectionHeader">
            <div class="sectionIconBadge">
              <i-editor theme="outline" size="16" />
            </div>
            <span class="sectionLabel">{{ $t('workbench.production.editVideo.subtitleProperties') }}</span>
          </div>
          <div class="sectionBody">
            <div class="propRow">
              <label class="propLabel">{{ $t('workbench.production.editVideo.textContent') }}</label>
              <t-textarea v-model="subtitleText" :autosize="{ minRows: 3, maxRows: 6 }" @change="handleUpdateClip('text', subtitleText)" />
            </div>
            <div class="propRow">
              <label class="propLabel">{{ $t('workbench.production.editVideo.fontSize') }}</label>
              <t-input-number
                v-model="subtitleFontSize"
                size="small"
                :min="12"
                :max="72"
                theme="normal"
                suffix="px"
                @change="handleUpdateClip('fontSize', subtitleFontSize)" />
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <t-button theme="default" variant="outline" block @click="handleDuplicateClip">
            <template #icon><i-copy theme="outline" size="16" /></template>
            {{ $t('workbench.production.editVideo.copy') }}
          </t-button>
          <t-button theme="danger" variant="text" block @click="handleDeleteClip">
            <template #icon><i-delete theme="outline" size="16" /></template>
            {{ $t('workbench.production.editVideo.delete') }}
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useTracksStore, useHistoryStore, type Clip } from "vue-clip-track";
import { DialogPlugin } from "tdesign-vue-next";
import { getClipIcon, getClipTypeName } from "./utils/clipMeta";

const tracksStore = useTracksStore();
const historyStore = useHistoryStore();

// 选中的 Clip
const selectedClip = computed(() => {
  const selected = tracksStore.selectedClips;
  return selected.length === 1 ? selected[0] : null;
});

// 基础属性
const clipName = ref("");

// 视频属性
const videoOpacity = ref(100);
const videoVolume = ref(100);
const videoSpeed = ref(1);

// 音频属性
const audioVolume = ref(100);
const audioFadeIn = ref(0);
const audioFadeOut = ref(0);

// 转场属性
const transitionType = ref("fade");
const transitionDuration = ref(1);

// 字幕属性
const subtitleText = ref("");
const subtitleFontSize = ref(24);

// 监听选中 Clip 变化，更新属性值
watch(
  selectedClip,
  (clip) => {
    if (!clip) return;

    clipName.value = clip.name || "";

    if (clip.type === "video") {
      // 使用 Math.round 取整，避免显示小数
      videoOpacity.value = Math.round(((clip as any).opacity ?? 1) * 100);
      videoVolume.value = Math.round(((clip as any).volume ?? 1) * 100);
      // 读取 playbackRate 属性，默认为 1
      videoSpeed.value = (clip as any).playbackRate ?? 1;
    }

    if (clip.type === "audio") {
      // 使用 Math.round 取整，避免显示小数
      audioVolume.value = Math.round(((clip as any).volume ?? 1) * 100);
      audioFadeIn.value = (clip as any).fadeIn ?? 0;
      audioFadeOut.value = (clip as any).fadeOut ?? 0;
    }

    if (clip.type === "transition") {
      transitionType.value = (clip as any).transitionType ?? "fade";
      transitionDuration.value = (clip as any).transitionDuration ?? 1;
    }

    if (clip.type === "subtitle") {
      subtitleText.value = (clip as any).text ?? "";
      subtitleFontSize.value = (clip as any).fontSize ?? 24;
    }
  },
  { immediate: true },
);

function handleUpdateClip(key: string, value: any) {
  if (!selectedClip.value) return;

  tracksStore.updateClip(selectedClip.value.id, { [key]: value });
  historyStore.pushSnapshot(`更新 Clip ${key}`);
}

// 处理播放倍速更新
function handleUpdatePlaybackRate(newRate: number) {
  if (!selectedClip.value) return;

  // 验证倍速范围
  if (newRate < 0.1 || newRate > 10) {
    console.warn("播放倍速必须在 0.1 到 10 之间");
    return;
  }

  // 使用 setClipPlaybackRate 方法更新倍速
  const result = tracksStore.setClipPlaybackRate(selectedClip.value.id, newRate, {
    allowShrink: true,
    allowExpand: true,
    handleCollision: true,
    keepStartTime: true,
  });

  if (result.success) {
    historyStore.pushSnapshot(`更新播放倍速为 ${newRate}x`);
  } else {
    console.warn("更新播放倍速失败:", result.message);
  }
}

function handleUpdateTransitionDuration() {
  if (!selectedClip.value || selectedClip.value.type !== "transition") return;

  const clip = selectedClip.value as any;
  const oldDuration = clip.transitionDuration || 1;
  const newDuration = transitionDuration.value;
  const center = (clip.startTime + clip.endTime) / 2;

  // 更新转场时长，保持中心点不变
  tracksStore.updateClip(clip.id, {
    startTime: center - newDuration / 2,
    endTime: center + newDuration / 2,
    transitionDuration: newDuration,
  });

  historyStore.pushSnapshot("更新转场时长");
}

function handleDeleteClip() {
  if (!selectedClip.value) return;

  const dialog = DialogPlugin.confirm({
    header: $t('workbench.production.editVideo.deleteConfirm'),
    body: $t('workbench.production.editVideo.deleteClipConfirm'),
    onConfirm: () => {
      tracksStore.removeClips([selectedClip.value!.id]);
      historyStore.pushSnapshot("删除 Clip");
      dialog.destroy();
    },
    onClose: () => dialog.destroy(),
  });
}

function handleDuplicateClip() {
  if (!selectedClip.value) return;

  const clip = selectedClip.value;
  const track = tracksStore.tracks.find((t) => t.id === clip.trackId);
  if (!track) return;

  // 创建副本，放在原 Clip 后面
  const newClip = {
    ...clip,
    id: `clip-${Date.now()}`,
    startTime: clip.endTime,
    endTime: clip.endTime + (clip.endTime - clip.startTime),
    selected: false,
  };

  tracksStore.addClip(track.id, newClip);
  historyStore.pushSnapshot("复制 Clip");
}
</script>

<style scoped lang="scss">
%flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.propertyPanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;

  .panelHeader {
    flex-shrink: 0;
    padding: 14px 12px;
    border-bottom: 1px solid #e8e8e8;
    background: #fff;

    .panelTitle {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
  }

  .panelContent {
    flex: 1;
    overflow-y: auto;
    padding: 10px;

    &::-webkit-scrollbar {
      width: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: #ddd;
      border-radius: 2px;
    }

    .emptyState {
      @extend %flex-center;
      flex-direction: column;
      height: 100%;
      gap: 12px;

      .emptyIconWrapper {
        width: 64px;
        height: 64px;
        @extend %flex-center;
        background: #fff;
        border-radius: 16px;
        border: 1px solid #e8e8e8;
      }

      .emptyText {
        font-size: 13px;
        color: #999;
      }
    }

    .properties {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .sectionCard {
        background: #fff;
        border: 1px solid transparent;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.2s;

        &:hover {
          border-color: #000000;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .sectionHeader {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid #f5f5f5;

          .sectionIconBadge {
            width: 28px;
            height: 28px;
            @extend %flex-center;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 8px;
            flex-shrink: 0;
            color: #000000;
          }

          .sectionLabel {
            flex: 1;
            font-size: 13px;
            font-weight: 600;
            color: #333;
          }
        }

        .sectionBody {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      }

      .propRow {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .propRowHead {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .propRowInline {
        display: flex;
        gap: 10px;

        .propField {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
      }

      .propLabel {
        font-size: 12px;
        font-weight: 500;
        color: #999;
        line-height: 1;
      }

      .propValueText {
        font-size: 12px;
        font-weight: 600;
        color: #333;
        font-variant-numeric: tabular-nums;
      }

      .durationRow {
        justify-content: space-between;
        align-items: center;
        padding-top: 4px;
        border-top: 1px dashed #f0f0f0;

        .durationLabel {
          font-size: 12px;
          color: #999;
        }
      }

      .actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}
</style>
