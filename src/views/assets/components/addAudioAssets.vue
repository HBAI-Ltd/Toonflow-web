<template>
  <t-dialog
    v-model:visible="addAssetsShow"
    :closable="false"
    width="40vw"
    :header="props.formData.id ? $t('common.edit') : $t('common.add')"
    :maskClosable="false"
    @close-btn-click="handleCancel"
    @confirm="onConfirm"
    @cancel="handleCancel">
    <div class="data">
      <t-form :data="props.formData" :rules="rules" ref="formRef">
        <t-form-item :label="$t('workbench.assets.add.audioName')" name="name">
          <t-input v-model="props.formData.name" :placeholder="$t('workbench.assets.add.audioNamePh')"></t-input>
        </t-form-item>
        <t-form-item :label="$t('workbench.assets.add.describe')" name="describe">
          <t-textarea v-model="props.formData.describe" :placeholder="$t('workbench.assets.add.describePh')"></t-textarea>
        </t-form-item>
        <t-form-item :label="$t('workbench.assets.add.sex')" name="remark">
          <t-input v-model="props.formData.sex" :placeholder="$t('workbench.assets.add.sexPh')"></t-input>
        </t-form-item>
        <t-form-item :label="$t('workbench.assets.add.audioFile')" name="audioFile">
          <div class="audio-list">
            <div v-for="(item, index) in audioItems" :key="index" class="audio-item">
              <div class="audio-upload-row">
                <div class="audio-file-area" @click="triggerFileInput(index)" @dragover.prevent @drop.prevent="(e) => handleDrop(e, index)">
                  <template v-if="item.file">
                    <i-volume-notice size="16" />
                    <span class="audio-filename">{{ item.file.name }}</span>
                  </template>
                  <template v-else-if="item.src">
                    <i-volume-notice size="16" fill="var(--td-success-color)" />
                    <span class="audio-filename audio-filename--existing">{{ item.name }}</span>
                    <t-tag size="small" theme="success" variant="light" style="margin-left: auto; flex-shrink: 0">{{ $t('common.uploaded') }}</t-tag>
                  </template>
                  <template v-else>
                    <i-upload-one size="16" fill="var(--td-brand-color)" />
                    <span class="audio-upload-hint">{{ $t('settings.vendor.test.uploadAudio') }}</span>
                  </template>
                  <input
                    :ref="(el) => (fileInputRefs[index] = el as HTMLInputElement)"
                    type="file"
                    accept="audio/*"
                    style="display: none"
                    @change="(e) => handleFileChange(e, index)" />
                </div>
                <t-button theme="danger" variant="outline" shape="circle" size="small" @click="removeAudioItem(index)">
                  <template #icon><i-close size="12" /></template>
                </t-button>
              </div>
              <t-input v-model="item.text" :placeholder="$t('assets.audio.textContent')" class="audio-text-input" />
              <t-input v-model="item.describe" :placeholder="$t('assets.audio.description')" class="audio-text-input" />
            </div>
            <t-button theme="primary" variant="outline" size="small" @click="addAudioItem">
              <template #icon><i-plus /></template>
              添加音频
            </t-button>
          </div>
        </t-form-item>
      </t-form>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

interface AudioItem {
  id?: number;
  src?: string;
  file: File | null;
  text: string;
  name: string;
  describe: string;
}
const props = defineProps<{
  formData: {
    id?: number;
    name: string;
    describe: string;
    sex: string;
    sonAssets?: {
      id?: number;
      src?: string;
      prompt: string;
      name?: string;
      describe?: string;
    }[];
  };
}>();
const addAssetsShow = defineModel<boolean>({
  default: false,
});
const rules = ref<{}>({
  name: [{ required: true, message: $t("workbench.assets.add.nameRequired"), trigger: "blur" }],
  describe: [{ required: true, message: $t("workbench.assets.add.describeRequired"), trigger: "blur" }],
});
function handleCancel() {
  addAssetsShow.value = false;
  // 重置音频列表
  audioItems.value = [{ file: null, text: "", name: "", describe: "" }];
}
const formRef = ref();
const emit = defineEmits(["getFilteredData"]);

const audioItems = ref<AudioItem[]>([{ file: null, text: "", name: "", describe: "" }]);
const fileInputRefs = ref<HTMLInputElement[]>([]);

// 初始化音频列表
watch(
  () => props.formData.sonAssets,
  (newSonAssets) => {
    if (newSonAssets && newSonAssets.length > 0) {
      audioItems.value = newSonAssets.map((asset) => ({
        id: asset.id,
        src: asset.src,
        file: null,
        text: asset.prompt,
        name: asset.name || "",
        describe: asset.describe || "",
      }));
    } else {
      audioItems.value = [{ file: null, text: "", name: "", describe: "" }];
    }
  },
  { immediate: true },
);

function addAudioItem() {
  audioItems.value.push({ file: null, text: "", name: "", describe: "" });
}

function removeAudioItem(index: number) {
  audioItems.value.splice(index, 1);
  if (audioItems.value.length === 0) {
    audioItems.value.push({ file: null, text: "", name: "", describe: "" });
  }
}

function triggerFileInput(index: number) {
  fileInputRefs.value[index]?.click();
}

function handleFileChange(e: Event, index: number) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    audioItems.value[index].file = file;
    audioItems.value[index].src = undefined;
    if (!audioItems.value[index].name) {
      audioItems.value[index].name = file.name;
    }
  }
  input.value = "";
}

function handleDrop(e: DragEvent, index: number) {
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith("audio/")) {
    audioItems.value[index].file = file;
    if (!audioItems.value[index].name) {
      audioItems.value[index].name = file.name;
    }
  } else if (file) {
    window.$message.warning($t("workbench.assets.add.pleaseUploadAudio"));
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function onConfirm() {
  formRef.value?.validate().then(async (result: any) => {
    if (result == true) {
      const assetsItem = (
        await Promise.all(
          audioItems.value.map(async (item) => {
            if (item.id != null && item.src) {
              return {
                id: item.id,
                src: item.src,
                prompt: item.text || "",
                name: item.name || item.src.split("/").pop() || "",
                describe: item.describe || "",
              };
            }
            if (item.file) {
              return {
                base64: await fileToBase64(item.file),
                prompt: item.text || "",
                name: item.name || item.file.name,
                describe: item.describe || "",
              };
            }
            return null;
          }),
        )
      ).filter(
        (
          item,
        ): item is
          | { id: number; src: string; prompt: string; name: string; describe: string }
          | { base64: string; prompt: string; name: string; describe: string } => !!item,
      );

      const payload = {
        name: props.formData.name,
        describe: props.formData.sex + "|" + props.formData.describe,
        projectId: project.value?.id ?? 0,
        assetsItem,
      };
      console.log(props.formData.id);
      if (props.formData.id) {
        await axios
          .post(`/assets/updateAudioAssets`, {
            id: props.formData.id,
            ...payload,
          })
          .then(() => {
            window.$message.success($t("workbench.assets.add.updateSuccess"));
            emit("getFilteredData");
            addAssetsShow.value = false;
          });
      } else {
        await axios.post(`/assets/addAudioAssets`, payload).then(() => {
          window.$message.success($t("workbench.assets.add.addSuccess"));
          emit("getFilteredData");
          addAssetsShow.value = false;
        });
      }
    }
  });
}
</script>

<style lang="scss" scoped>
.modalHeader {
  background: var(--td-bg-color-container);
  width: 100%;

  :deep(.ant-typography) {
    color: var(--td-text-color-primary);
    margin: 0;
  }

  :deep(.ant-btn-text) {
    color: var(--td-brand-color);

    &:hover {
      background: var(--td-bg-color-component-hover);
      color: var(--td-brand-color-hover);
    }
  }
}

.data {
  width: 100%;
}

.audio-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  .audio-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    border: 1px solid var(--td-border-level-1-color);
    border-radius: 6px;
    background: var(--td-bg-color-secondarycontainer);

    .audio-upload-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .audio-file-area {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: 1px dashed var(--td-component-border);
        border-radius: 4px;
        cursor: pointer;
        min-height: 34px;
        transition: border-color 0.2s;

        &:hover {
          border-color: var(--td-brand-color);
          background: var(--td-bg-color-secondarycontainer-hover);
        }

        .audio-filename {
          font-size: 13px;
          color: var(--td-text-color-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
          flex: 1;

          &--existing {
            color: var(--td-success-color);
          }
        }

        .audio-upload-hint {
          font-size: 12px;
          color: var(--td-text-color-placeholder);
        }
      }
    }

    .audio-text-input {
      width: 100%;
    }
  }
}
</style>
