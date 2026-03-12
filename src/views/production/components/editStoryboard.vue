<template>
  <div class="editStoryboard">
    <t-dialog v-model:visible="editStoryboardShow" header="镜头编辑器" width="70%" top="2vh" placement="center" @confirm="keep">
      <div class="data f">
        <div class="imageData">
          <t-card title="镜头图">
            <div class="f" style="gap: 12px">
              <div class="imageWrapper" @mouseenter="hoveredImage = 'main'" @mouseleave="hoveredImage = null">
                <div style="position: relative">
                  <t-image :src="props.storyboardForm.imageUrl" fit="cover" class="image" />
                  <div class="tag">
                    <t-tag theme="primary" size="small" variant="light-outline">图1</t-tag>
                  </div>
                  <div class="imageOverlay" v-show="hoveredImage === 'main'">
                    <div class="iconBtn previewBtn" @click="previewImage(props.storyboardForm.imageUrl)">
                      <i-preview-open theme="outline" size="20" fill="#ffffff" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="customUpload">
                <t-upload
                  ref="customUploadRef"
                  action=""
                  v-model="customFileList"
                  :autoUpload="false"
                  theme="custom"
                  accept="image/*"
                  :max="1"
                  @change="handleCustomUpload"
                  :showImageFileName="false">
                  <div class="uploadPlaceholder f ac jc">
                    <i-plus theme="outline" size="24" fill="#999" />
                    <span style="font-size: 12px; color: #999; margin-top: 8px">上传图片</span>
                  </div>
                </t-upload>
              </div>
            </div>
          </t-card>
          <t-card title="其他" :style="{ marginTop: '20px' }">
            <div class="f w" style="gap: 12px">
              <div
                v-for="(item, index) in otherFileList"
                :key="index"
                class="imageWrapper"
                @mouseenter="hoveredImage = `other-${index}`"
                @mouseleave="hoveredImage = null">
                <div style="position: relative">
                  <div class="tag">
                    <t-tag theme="primary" size="small" variant="light-outline">图{{ index + 2 }}</t-tag>
                  </div>
                  <t-image :src="item.url" fit="cover" class="image" />
                  <div class="imageOverlay" v-show="hoveredImage === `other-${index}`">
                    <div class="iconBtn previewBtn" @click="previewImage(item.url)">
                      <i-preview-open theme="outline" size="18" fill="#ffffff" />
                    </div>
                    <div class="iconBtn deleteBtn" @click="deleteOtherImage(index)">
                      <i-delete theme="outline" size="18" fill="#ffffff" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="selectImage c" @click="selectImage">
                <i-plus theme="outline" size="24" fill="#999" />
                <span style="font-size: 12px; color: #999; margin-top: 8px">添加图片</span>
              </div>
            </div>
          </t-card>
          <t-card title="编辑指令" :style="{ marginTop: '20px' }">
            <t-textarea
              v-model="instruction"
              placeholder="请输入编辑指令，您可以通过@来引用其他图像"
              name="description"
              :autosize="{ minRows: 5, maxRows: 5 }" />
            <div class="generateImageBtn f ac jc" style="margin-top: 12px">
              <t-button theme="primary" size="large" block @click="generateImage">生成图片</t-button>
            </div>
          </t-card>
        </div>
        <div class="result">
          <t-card title="镜头提示词">
            <div class="promptDisplay">{{ props.storyboardForm.prompt || "暂无提示词" }}</div>
          </t-card>
          <t-card title="生成结果" :style="{ marginTop: '20px' }">
            <div class="resultContainer">
              <div class="f w" style="gap: 12px">
                <div
                  v-for="(item, index) in generatedResult"
                  :key="index"
                  class="imageWrapper generatedImage"
                  :class="{ selectedImage: selectedResultIndex === index }"
                  @mouseenter="hoveredImage = `result-${index}`"
                  @mouseleave="hoveredImage = null"
                  @click="selectResult(index)">
                  <div style="position: relative">
                    <t-image :src="item.url" fit="cover" class="image" />
                    <div class="selectedIndicator" v-show="selectedResultIndex === index">
                      <i-check-one theme="filled" size="24" fill="#000000" />
                    </div>
                    <div class="imageOverlay" v-show="hoveredImage === `result-${index}`">
                      <div class="iconBtn previewBtn" @click.stop="previewImage(item.url)">
                        <i-preview-open theme="outline" size="18" fill="#ffffff" />
                      </div>
                      <div class="iconBtn deleteBtn" @click.stop="deleteResult(index)">
                        <i-delete theme="outline" size="18" fill="#ffffff" />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="emptyPlaceholder" v-if="generatedResult.length === 0">
                  <i-picture theme="outline" size="32" fill="#ccc" />
                  <span style="color: #999; margin-top: 8px">暂无生成结果</span>
                </div>
              </div>
            </div>
          </t-card>
        </div>
      </div>
    </t-dialog>
    <t-image-viewer :images="[previewImageUrl]" v-model:visible="showPreview" />
  </div>
</template>

<script setup lang="ts">
import { useFileDialog } from "@vueuse/core";
const editStoryboardShow = defineModel<boolean>();

const props = defineProps({
  storyboardForm: {
    type: Object,
    default: () => ({}),
  },
});

// 悬停状态
const hoveredImage = ref<string | null>(null);

// 图片预览
const showPreview = ref(false);
const previewImageUrl = ref("");

function previewImage(url: string) {
  previewImageUrl.value = url;
  showPreview.value = true;
}

// 生成结果选中状态
const selectedResultIndex = ref<number | null>(null);

function selectResult(index: number) {
  selectedResultIndex.value = index;
}

// 删除生成结果
function deleteResult(index: number) {
  generatedResult.value.splice(index, 1);
  if (selectedResultIndex.value === index) {
    selectedResultIndex.value = null;
  } else if (selectedResultIndex.value !== null && selectedResultIndex.value > index) {
    selectedResultIndex.value--;
  }
  MessagePlugin.success("删除成功");
}

// 删除其他图片
function deleteOtherImage(index: number) {
  otherFileList.value.splice(index, 1);
  MessagePlugin.success("删除成功");
}

//自定义上传图片
const customFileList = ref<any[]>([]);
// 处理自定义上传
function handleCustomUpload(files: any[]): void {
  if (files.length > 0) {
    const file = files[0]?.raw || files[0];
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        props.storyboardForm.imageUrl = base64;
        MessagePlugin.success("上传成功");
        customFileList.value = [];
      };
      reader.readAsDataURL(file);
    }
  }
}
//其他图片
const otherFileList = ref<any[]>([
  {
    url: "https://tdesign.gtimg.com/demo/demo-image-1.png",
  },
  {
    url: "https://tdesign.gtimg.com/demo/demo-image-1.png",
  },
  {
    url: "https://tdesign.gtimg.com/demo/demo-image-1.png",
  },
]);
//指令
const instruction = ref("");
//选择其他图片
function selectImage() {}
//生成结果
const generatedResult = ref<{ url: string }[]>([
  { url: "https://tdesign.gtimg.com/demo/demo-image-1.png" },
  { url: "https://tdesign.gtimg.com/demo/demo-image-1.png" },
]);
//确定
function keep() {
  editStoryboardShow.value = false;
}
//生成图片
function generateImage() {
  // 模拟生成图片
  generatedResult.value.push({ url: "https://tdesign.gtimg.com/demo/demo-image-1.png" });
  MessagePlugin.success("图片生成成功");
}
</script>

<style lang="scss" scoped>
.editStoryboard {
  .data {
    gap: 20px;
    .imageData {
      flex: 1;
      .imageWrapper {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .image {
        width: 120px;
        height: 120px;
        border-radius: 12px;
        object-fit: cover;
        display: block;
      }

      .tag {
        position: absolute;
        right: 8px;
        bottom: 8px;
        z-index: 2;
      }
      .customUpload {
        .uploadPlaceholder {
          width: 120px;
          height: 120px;
          border: 2px dashed #d9d9d9;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-direction: column;
          background: #fafafa;
        }
      }
      .selectImage {
        width: 120px;
        height: 120px;
        border: 2px dashed #d9d9d9;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        flex-direction: column;
        background: #fafafa;
      }
    }
    .result {
      flex: 1;
      .promptDisplay {
        border-radius: 8px;
        color: #666;
        min-height: 60px;
        max-height: 120px;
        overflow-y: auto;
      }

      .resultContainer {
        max-height: 450px;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .imageWrapper {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
      }

      .image {
        width: 120px;
        height: 120px;
        border-radius: 12px;
        object-fit: cover;
        display: block;
        transition: all 0.3s ease;
      }

      .selectedIndicator {
        position: absolute;
        right: 5px;
        top: 5px;
        z-index: 3;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .emptyPlaceholder {
        width: 100%;
        height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: #fafafa;
      }
    }
  }

  .imageOverlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 2;
    border-radius: 12px;
    animation: fadeIn 0.2s ease;
  }
  .iconBtn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
  }
}
</style>
