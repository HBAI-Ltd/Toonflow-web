<template>
  <t-dialog
    placement="center"
    width="58vw"
    v-model:visible="visible"
    :header="$t('settings.vendor.test.videoTitle') + ' - ' + modelName"
    :footer="false"
    @closed="handleClose">
    <div class="videoTestDialog">
      <!-- 模式选择 -->
      <div class="modeBar">
        <div class="modeLabel">{{ $t("settings.vendor.test.selectMode") }}</div>
        <t-radio-group v-model="selectedMode" variant="default-filled">
          <t-radio-button v-for="m in parsedModes" :key="m.key" :value="m.key">{{ m.label }}</t-radio-button>
        </t-radio-group>
      </div>

      <!-- 当前模式说明 -->
      <div v-if="currentModeInfo" class="modeDesc">
        <t-icon name="info-circle-filled" size="14px" />
        {{ currentModeInfo.desc }}
      </div>

      <!-- 动态输入区 -->
      <div class="inputSection" v-if="selectedMode">
        <!-- 文生视频：只需文本 -->
        <template v-if="selectedMode === 'text'">
          <t-form-item :label="$t('settings.vendor.test.prompt')">
            <t-textarea
              v-model="prompt"
              :placeholder="$t('settings.vendor.test.videoPromptPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 4 }"
              :disabled="loading" />
          </t-form-item>
        </template>

        <!-- 单图参考 -->
        <template v-else-if="selectedMode === 'singleImage'">
          <t-form-item :label="$t('settings.vendor.test.referenceImage')">
            <div class="uploadRow">
              <ImageUploadBox v-model="uploadedImages[0]" />
            </div>
          </t-form-item>
          <t-form-item :label="$t('settings.vendor.test.prompt')">
            <t-textarea
              v-model="prompt"
              :placeholder="$t('settings.vendor.test.videoPromptPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 3 }"
              :disabled="loading" />
          </t-form-item>
        </template>

        <!-- 首尾帧（两张必填） -->
        <template v-else-if="selectedMode === 'startEndRequired'">
          <div class="frameRow">
            <t-form-item :label="$t('settings.vendor.test.startFrame')">
              <ImageUploadBox v-model="uploadedImages[0]" />
            </t-form-item>
            <t-form-item :label="$t('settings.vendor.test.endFrame')">
              <ImageUploadBox v-model="uploadedImages[1]" />
            </t-form-item>
          </div>
          <t-form-item :label="$t('settings.vendor.test.prompt')">
            <t-textarea
              v-model="prompt"
              :placeholder="$t('settings.vendor.test.videoPromptPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 3 }"
              :disabled="loading" />
          </t-form-item>
        </template>

        <!-- 首尾帧（尾帧可选） -->
        <template v-else-if="selectedMode === 'endFrameOptional'">
          <div class="frameRow">
            <t-form-item :label="$t('settings.vendor.test.startFrame')">
              <ImageUploadBox v-model="uploadedImages[0]" />
            </t-form-item>
            <t-form-item :label="$t('settings.vendor.test.endFrameOptional')">
              <ImageUploadBox v-model="uploadedImages[1]" :optional="true" />
            </t-form-item>
          </div>
          <t-form-item :label="$t('settings.vendor.test.prompt')">
            <t-textarea
              v-model="prompt"
              :placeholder="$t('settings.vendor.test.videoPromptPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 3 }"
              :disabled="loading" />
          </t-form-item>
        </template>

        <!-- 首尾帧（首帧可选） -->
        <template v-else-if="selectedMode === 'startFrameOptional'">
          <div class="frameRow">
            <t-form-item :label="$t('settings.vendor.test.startFrameOptional')">
              <ImageUploadBox v-model="uploadedImages[0]" :optional="true" />
            </t-form-item>
            <t-form-item :label="$t('settings.vendor.test.endFrame')">
              <ImageUploadBox v-model="uploadedImages[1]" />
            </t-form-item>
          </div>
          <t-form-item :label="$t('settings.vendor.test.prompt')">
            <t-textarea
              v-model="prompt"
              :placeholder="$t('settings.vendor.test.videoPromptPlaceholder')"
              :autosize="{ minRows: 2, maxRows: 3 }"
              :disabled="loading" />
          </t-form-item>
        </template>
        <!-- 多参考模式（multiReference / 数组组合） -->
        <template v-else-if="selectedMode.startsWith('[')">
          <t-form-item :label="$t('settings.vendor.test.prompt')">
            <t-textarea v-model="prompt" :placeholder="$t('settings.vendor.test.videoPromptPlaceholder')" :disabled="loading" />
          </t-form-item>
          <div class="multiRefSection">
            <template v-for="(ref, rIdx) in currentMultiRefs" :key="rIdx">
              <t-form-item :label="getRefLabel(ref)">
                <div class="multiRefRow">
                  <template v-if="ref.type === 'imageReference'">
                    <ImageUploadBox
                      v-for="i in ref.count"
                      :key="i"
                      v-model="uploadedImages[rIdx * 10 + i - 1]"
                      :label="`${$t('settings.vendor.test.image')} ${i}`" />
                  </template>
                  <template v-else-if="ref.type === 'videoReference'">
                    <VideoUploadBox
                      v-for="i in ref.count"
                      :key="i"
                      v-model="uploadedVideos[rIdx * 10 + i - 1]"
                      :label="`${$t('settings.vendor.test.video')} ${i}`" />
                  </template>
                  <template v-else-if="ref.type === 'audioReference'">
                    <AudioUploadBox
                      v-for="i in ref.count"
                      :key="i"
                      v-model="uploadedAudios[rIdx * 10 + i - 1]"
                      :label="`${$t('settings.vendor.test.audio')} ${i}`" />
                  </template>
                </div>
              </t-form-item>
            </template>
          </div>
        </template>
      </div>

      <!-- 结果区 -->
      <div v-if="resultUrl" class="resultSection">
        <div class="resultLabel">{{ $t("settings.vendor.test.result") }}</div>
        <video :src="resultUrl" controls autoplay loop class="resultVideo" />
      </div>
      <input ref="resultVideoInputRef" type="file" accept="video/*" style="display: none" @change="uploadResultVideo" />

      <!-- 底部操作 -->
      <div class="dialogFooter">
        <t-button variant="outline" @click="visible = false">{{ $t("settings.vendor.test.cancel") }}</t-button>
        <t-button theme="primary" :disabled="!canSubmit" @click="copyManualPrompt">
          <template #icon><t-icon name="file-copy" /></template>
          复制完整视频提示词
        </t-button>
        <t-button theme="success" variant="outline" @click="resultVideoInputRef?.click()">
          <template #icon><t-icon name="upload" /></template>
          上传生成视频
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import ImageUploadBox from "./ImageUploadBox.vue";
import VideoUploadBox from "./VideoUploadBox.vue";
import AudioUploadBox from "./AudioUploadBox.vue";
import { buildManualVideoPrompt, copyText, fileToDataUrl } from "@/utils/manualMedia";

type VideoRawMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | string // videoReference:N, imageReference:N, audioReference:N
  | string[]; // 数组组合，即 multiReference

interface RefItem {
  type: "videoReference" | "imageReference" | "audioReference";
  count: number;
}

interface ParsedMode {
  key: string;
  label: string;
  desc: string;
  refs?: RefItem[];
}

const props = defineProps<{
  vendorId: string;
  modelName: string;
  /** 模型的 mode 数组（原始结构） */
  rawModes: VideoRawMode[];
}>();
const visible = defineModel<boolean>("modelVisible");

const SIMPLE_MODE_MAP: Record<string, { label: string; desc: string }> = {
  text: {
    label: $t("settings.vendor.test.textToVideo"),
    desc: $t("settings.vendor.test.textToVideoDesc"),
  },
  singleImage: {
    label: $t("settings.vendor.test.singleImageMode"),
    desc: $t("settings.vendor.test.singleImageDesc"),
  },
  startEndRequired: {
    label: $t("settings.vendor.startEndRequired"),
    desc: $t("settings.vendor.test.startEndRequiredDesc"),
  },
  endFrameOptional: {
    label: $t("settings.vendor.endFrameOptional"),
    desc: $t("settings.vendor.test.endFrameOptionalDesc"),
  },
  startFrameOptional: {
    label: $t("settings.vendor.startFrameOptional"),
    desc: $t("settings.vendor.test.startFrameOptionalDesc"),
  },
};

/** 解析 rawModes，生成可展示的 mode 列表 */
const parsedModes = computed<ParsedMode[]>(() => {
  const result: ParsedMode[] = [];
  let multiRefIdx = 0;
  for (const m of props.rawModes) {
    if (Array.isArray(m)) {
      // multiReference 数组
      const refs: RefItem[] = [];
      for (const ref of m) {
        const match = String(ref).match(/^(videoReference|imageReference|audioReference):(\d+)$/);
        if (match) {
          refs.push({
            type: match[1] as RefItem["type"],
            count: Number(match[2]),
          });
        }
      }
      if (refs.length > 0) {
        multiRefIdx++;
        const labelParts = refs
          .map((r) => {
            const typeLabel =
              r.type === "imageReference"
                ? $t("settings.vendor.imageRef")
                : r.type === "videoReference"
                  ? $t("settings.vendor.videoRef")
                  : $t("settings.vendor.audioRef");
            return `${typeLabel}×${r.count}`;
          })
          .join(" + ");
        result.push({
          key: JSON.stringify(m),
          label: labelParts,
          desc: `${$t("settings.vendor.test.multiRefDesc")}: ${labelParts}`,
          refs,
        });
      }
    } else {
      const info = SIMPLE_MODE_MAP[String(m)];
      if (info) {
        result.push({ key: String(m), label: info.label, desc: info.desc });
      }
    }
  }
  return result;
});

const selectedMode = ref("");

watch(
  parsedModes,
  (modes) => {
    if (modes.length > 0 && !modes.find((m) => m.key === selectedMode.value)) {
      selectedMode.value = modes[0]?.key ?? "";
    }
  },
  { immediate: true },
);

watch(selectedMode, () => {
  resetUploads();
  resultUrl.value = "";
});

const currentModeInfo = computed(() => parsedModes.value.find((m) => m.key === selectedMode.value) ?? null);

const currentMultiRefs = computed<RefItem[]>(() => currentModeInfo.value?.refs ?? []);

const prompt = ref("");
const uploadedImages = ref<(File | null)[]>(Array(30).fill(null));
const uploadedVideos = ref<(File | null)[]>(Array(30).fill(null));
const uploadedAudios = ref<(File | null)[]>(Array(30).fill(null));
const loading = ref(false);
const resultUrl = ref("");
const resultVideoInputRef = ref<HTMLInputElement | null>(null);

function resetUploads() {
  uploadedImages.value = Array(30).fill(null);
  uploadedVideos.value = Array(30).fill(null);
  uploadedAudios.value = Array(30).fill(null);
}

const canSubmit = computed(() => {
  if (loading.value || !selectedMode.value) return false;
  if (selectedMode.value === "text") return !!prompt.value.trim();
  if (selectedMode.value === "singleImage") return !!uploadedImages.value[0];
  if (selectedMode.value === "startEndRequired") return !!uploadedImages.value[0] && !!uploadedImages.value[1];
  if (selectedMode.value === "endFrameOptional") return !!uploadedImages.value[0];
  if (selectedMode.value === "startFrameOptional") return !!uploadedImages.value[1];
  if (selectedMode.value.startsWith("[")) {
    // 验证所有非可选 ref 都已上传
    for (let rIdx = 0; rIdx < currentMultiRefs.value.length; rIdx++) {
      const ref = currentMultiRefs.value[rIdx];
      for (let i = 0; i < ref.count; i++) {
        const fileIdx = rIdx * 10 + i;
        if (ref.type === "imageReference" && !uploadedImages.value[fileIdx]) return false;
        if (ref.type === "videoReference" && !uploadedVideos.value[fileIdx]) return false;
        if (ref.type === "audioReference" && !uploadedAudios.value[fileIdx]) return false;
      }
    }
    return true;
  }
  return false;
});

function getRefLabel(ref: RefItem): string {
  if (ref.type === "imageReference") return `${$t("settings.vendor.imageRef")} (×${ref.count})`;
  if (ref.type === "videoReference") return `${$t("settings.vendor.videoRef")} (×${ref.count})`;
  return `${$t("settings.vendor.audioRef")} (×${ref.count})`;
}
async function copyManualPrompt() {
  try {
    const references = [
      ...uploadedImages.value.filter(Boolean).map((file) => ({ fileType: "image", name: file?.name })),
      ...uploadedVideos.value.filter(Boolean).map((file) => ({ fileType: "video", name: file?.name })),
      ...uploadedAudios.value.filter(Boolean).map((file) => ({ fileType: "audio", name: file?.name })),
    ];
    await copyText(
      buildManualVideoPrompt({
        name: props.modelName,
        prompt: prompt.value,
        mode: selectedMode.value,
        references,
      }),
    );
    window.$message.success("完整视频提示词已复制，请在外部工具生成后上传结果");
  } catch (e: any) {
    window.$message.error(e?.message ?? "复制完整视频提示词失败");
  }
}

async function uploadResultVideo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  resultUrl.value = await fileToDataUrl(file);
  (event.target as HTMLInputElement).value = "";
  window.$message.success("生成视频已上传到测试结果区");
}

function handleClose() {
  prompt.value = "";
  resetUploads();
  resultUrl.value = "";
  loading.value = false;
}
</script>

<style lang="scss" scoped>
.videoTestDialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 80vh;
  overflow-y: auto;
  padding-right: 2px;

  .modeBar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .modeLabel {
      font-size: 13px;
      color: var(--td-text-color-secondary);
    }
  }

  .modeDesc {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    background: var(--td-bg-color-container-hover);
    padding: 6px 12px;
    border-radius: 6px;
  }

  .inputSection {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .frameRow {
      display: flex;
      align-items: flex-start;
      gap: 16px;

      .frameArrow {
        margin-top: 32px;
        font-size: 20px;
        color: var(--td-text-color-placeholder);
        flex-shrink: 0;
      }
    }

    .uploadRow {
      display: flex;
      gap: 12px;
    }

    .multiRefSection {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .multiRefRow {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
    }
  }

  .resultSection {
    .resultLabel {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--td-text-color-secondary);
    }

    .resultVideo {
      width: 100%;
      max-height: 40vh;
      border-radius: 8px;
      background: #000;
    }
  }

  .loadingSection {
    display: flex;
    justify-content: center;
    padding: 32px 0;
  }

  .dialogFooter {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid var(--td-component-border);
    padding-top: 12px;
    position: sticky;
    bottom: 0;
    background: var(--td-bg-color-container);
    padding-bottom: 4px;
  }
}
</style>
