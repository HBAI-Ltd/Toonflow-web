<template>
  <t-dialog
    placement="center"
    width="58vw"
    v-model:visible="visible"
    :header="$t('settings.vendor.test.imageTitle') + ' - ' + modelName"
    :footer="false"
    @closed="handleClose">
    <div class="imageTestDialog">
      <!-- 模式选择 -->
      <div class="modeBar">
        <t-radio-group v-model="testMode" variant="default-filled">
          <t-radio-button v-for="m in availableModes" :key="m.value" :value="m.value">{{ m.label }}</t-radio-button>
        </t-radio-group>
      </div>

      <!-- 输入区 -->
      <div class="inputSection">
        <!-- 图生图：单张上传图片 -->
        <div v-if="testMode === 'singleImage'" class="uploadRow">
          <div class="uploadBox" @click="triggerImageUpload" @dragover.prevent @drop.prevent="handleDrop">
            <img v-if="imagePreview" :src="imagePreview" class="previewImg" alt="preview" />
            <template v-else>
              <i-picture theme="outline" size="32" fill="var(--td-brand-color)" />
              <p class="uploadText">{{ $t("settings.vendor.test.uploadImage") }}</p>
              <p class="uploadHint">{{ $t("settings.vendor.test.supportFormat") }}</p>
            </template>
          </div>
          <input ref="imageInputRef" type="file" accept="image/*" style="display: none" @change="handleImageChange" />
        </div>

        <!-- 多图参考：多图上传列表 -->
        <div v-else-if="testMode === 'multiReference'" class="multiRefSection">
          <div class="multiRefHeader">
            <span class="refTitle">{{ $t("settings.vendor.test.referenceImage") }} ({{ multiImages.length }}/5)</span>
          </div>
          <div class="multiRefGrid">
            <div
              v-for="(img, index) in multiImages"
              :key="index"
              class="multiRefItem">
              <img :src="img.preview" class="multiRefImg" alt="ref" />
              <div class="refIndexBadge">{{ index + 1 }}</div>
              <button class="removeRefBtn" @click.stop="removeMultiImage(index)">
                <i-close theme="outline" size="12" />
              </button>
            </div>
            <div
              v-if="multiImages.length < 5"
              class="multiRefAddBox"
              @click="triggerMultiUpload"
              @dragover.prevent
              @drop.prevent="handleMultiDrop">
              <i-plus theme="outline" size="24" fill="var(--td-brand-color)" />
              <span class="addText">{{ $t("settings.vendor.test.addImage") }}</span>
            </div>
          </div>
          <input
            ref="multiInputRef"
            type="file"
            accept="image/*"
            multiple
            style="display: none"
            @change="handleMultiImageChange" />
        </div>

        <!-- 参数配置：分辨率 & 比例 -->
        <div class="paramsRow">
          <div class="paramItem">
            <span class="paramLabel">{{ $t("settings.vendor.test.resolution") }}</span>
            <t-select v-model="size" size="small" style="width: 120px">
              <t-option value="1K" label="1K" />
              <t-option value="2K" label="2K" />
              <t-option value="4K" label="4K" />
            </t-select>
          </div>
          <div class="paramItem">
            <span class="paramLabel">{{ $t("settings.vendor.test.aspectRatio") }}</span>
            <t-select v-model="aspectRatio" size="small" style="width: 130px">
              <t-option value="16:9" label="16:9 (横屏)" />
              <t-option value="9:16" label="9:16 (竖屏)" />
              <t-option value="1:1" label="1:1 (方形)" />
              <t-option value="4:3" label="4:3" />
              <t-option value="3:4" label="3:4" />
            </t-select>
          </div>
        </div>

        <t-form-item :label="$t('settings.vendor.test.prompt')">
          <t-textarea
            v-model="prompt"
            :placeholder="testMode === 'multiReference' ? $t('settings.vendor.test.multiRefPromptPlaceholder') : $t('settings.vendor.test.promptPlaceholder')"
            :autosize="{ minRows: 2, maxRows: 4 }" />
        </t-form-item>
      </div>

      <!-- 后台任务提示：测试不再阻塞页面，切走也继续运行 -->
      <div v-if="submitted" class="loadingSection bgTaskHint">
        <div class="bgTaskHint__text">测试已在后台运行，可关闭此窗口继续其他操作。</div>
        <t-button size="small" variant="text" theme="primary" @click="taskStore.collapse(false)">在右下角任务托盘查看进度与结果 →</t-button>
      </div>

      <!-- 底部操作 -->
      <div class="dialogFooter">
        <t-button variant="outline" @click="visible = false">{{ $t("settings.vendor.test.cancel") }}</t-button>
        <t-button theme="primary" :disabled="!canSubmit" @click="handleTest">
          <template #icon><i-lightning theme="outline" /></template>
          {{ $t("settings.vendor.test.startTest") }}
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import backgroundTaskStore from "@/stores/backgroundTask";

type ImageMode = "text" | "singleImage" | "multiReference";
const visible = defineModel<boolean>("modelVisible");

const props = defineProps<{
  vendorId: string;
  modelName: string;
  /** 模型支持的 mode 列表 */
  supportedModes: ImageMode[];
}>();
const taskStore = backgroundTaskStore();

const MODE_OPTIONS: { value: ImageMode; label: string }[] = [
  { value: "text", label: $t("settings.vendor.test.textToImage") },
  { value: "singleImage", label: $t("settings.vendor.test.imageToImage") },
  { value: "multiReference", label: $t("settings.vendor.test.multiRef") },
];

const availableModes = computed(() => MODE_OPTIONS.filter((m) => props.supportedModes.includes(m.value)));

const testMode = ref<ImageMode>("text");
const size = ref<"1K" | "2K" | "4K">("1K");
const aspectRatio = ref<string>("16:9");

watch(
  () => props.supportedModes,
  (modes) => {
    if (modes.length > 0 && !modes.includes(testMode.value)) {
      testMode.value = modes[0];
    }
  },
  { immediate: true },
);

watch(testMode, () => {
  imageFile.value = null;
  imagePreview.value = "";
  multiImages.value = [];
});

const prompt = ref("");
const imageFile = ref<File | null>(null);
const imagePreview = ref("");
const imageInputRef = ref<HTMLInputElement | null>(null);

interface MultiImgItem {
  file: File;
  preview: string;
}
const multiImages = ref<MultiImgItem[]>([]);
const multiInputRef = ref<HTMLInputElement | null>(null);

const submitted = ref(false); // 是否已提交后台任务（替代原阻塞式 loading）

const canSubmit = computed(() => {
  if (testMode.value === "text") return !!prompt.value.trim();
  if (testMode.value === "singleImage") return !!imageFile.value;
  if (testMode.value === "multiReference") return multiImages.value.length > 0 || !!prompt.value.trim();
  return false;
});

function triggerImageUpload() {
  imageInputRef.value?.click();
}

function handleImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  imageFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
  (e.target as HTMLInputElement).value = "";
}

function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith("image/")) {
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
}

function triggerMultiUpload() {
  multiInputRef.value?.click();
}

function handleMultiImageChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []);
  for (const file of files) {
    if (multiImages.value.length >= 5) break;
    multiImages.value.push({
      file,
      preview: URL.createObjectURL(file),
    });
  }
  (e.target as HTMLInputElement).value = "";
}

function handleMultiDrop(e: DragEvent) {
  const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith("image/"));
  for (const file of files) {
    if (multiImages.value.length >= 5) break;
    multiImages.value.push({
      file,
      preview: URL.createObjectURL(file),
    });
  }
}

function removeMultiImage(index: number) {
  multiImages.value.splice(index, 1);
}

const fileToDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string); // data:image/...;base64,xxxx
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

async function handleTest() {
  const payload: Record<string, any> = {
    modelName: props.modelName,
    id: props.vendorId,
    size: size.value,
    aspectRatio: aspectRatio.value,
  };
  const p = prompt.value.trim();
  if (p) payload.prompt = p;

  if (testMode.value === "singleImage" && imageFile.value) {
    payload.imageBase64 = await fileToDataURL(imageFile.value);
  } else if (testMode.value === "multiReference" && multiImages.value.length > 0) {
    const b64List: string[] = [];
    for (const item of multiImages.value) {
      b64List.push(await fileToDataURL(item.file));
    }
    payload.imagesBase64 = b64List;
  }

  // 交给全局后台任务中心：切页/关窗都继续运行，完成后托盘展示结果图与失败原因
  taskStore.addImageModelTest(payload, `${props.modelName} 测试图`);
  submitted.value = true;
  window.$message.success("已加入后台任务，可关闭窗口继续其他操作");
}

function handleClose() {
  prompt.value = "";
  imageFile.value = null;
  imagePreview.value = "";
  multiImages.value = [];
  submitted.value = false;
}
</script>

<style lang="scss" scoped>
.imageTestDialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 4px;

  .modeBar {
    display: flex;
    justify-content: center;
  }

  .inputSection {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .paramsRow {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 6px 0;

      .paramItem {
        display: flex;
        align-items: center;
        gap: 8px;

        .paramLabel {
          font-size: 13px;
          color: var(--td-text-color-secondary);
          white-space: nowrap;
        }
      }
    }

    .uploadRow {
      display: flex;
      justify-content: center;

      .uploadBox {
        width: 200px;
        height: 150px;
        border: 2px dashed var(--td-component-border);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: border-color 0.2s;
        overflow: hidden;

        &:hover {
          border-color: var(--td-brand-color);
        }

        .previewImg {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .uploadText {
          font-size: 13px;
          margin: 0;
        }

        .uploadHint {
          font-size: 11px;
          color: var(--td-text-color-placeholder);
          margin: 0;
        }
      }
    }

    .multiRefSection {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .multiRefHeader {
        .refTitle {
          font-size: 13px;
          color: var(--td-text-color-secondary);
          font-weight: 500;
        }
      }

      .multiRefGrid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;

        .multiRefItem {
          position: relative;
          width: 96px;
          height: 96px;
          border-radius: 8px;
          border: 1px solid var(--td-component-border);
          overflow: hidden;
          background: var(--td-bg-color-secondarycontainer);
          display: flex;
          align-items: center;
          justify-content: center;

          .multiRefImg {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .refIndexBadge {
            position: absolute;
            left: 4px;
            bottom: 4px;
            background: rgba(0, 0, 0, 0.6);
            color: #fff;
            font-size: 10px;
            padding: 1px 5px;
            border-radius: 4px;
          }

          .removeRefBtn {
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.55);
            border: none;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #fff;
            padding: 0;
            transition: background 0.2s;

            &:hover {
              background: rgba(220, 38, 38, 0.85);
            }
          }
        }

        .multiRefAddBox {
          width: 96px;
          height: 96px;
          border: 2px dashed var(--td-component-border);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;

          &:hover {
            border-color: var(--td-brand-color);
            background: var(--td-brand-color-light);
          }

          .addText {
            font-size: 11px;
            color: var(--td-text-color-placeholder);
          }
        }
      }
    }
  }

  .resultSection {
    .resultHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .resultLabel {
        font-size: 13px;
        font-weight: 600;
        color: var(--td-text-color-secondary);
      }
    }

    .resultImg {
      display: flex;
      justify-content: center;
      background: var(--td-bg-color-component);
      border-radius: 8px;
      padding: 12px;
      max-height: 45vh;
      overflow: auto;

      img {
        max-width: 100%;
        max-height: 40vh;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
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
  }
}

.bgTaskHint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 20px 0;

  &__text {
    font-size: 13px;
    color: var(--td-text-color-secondary);
  }
}
</style>
