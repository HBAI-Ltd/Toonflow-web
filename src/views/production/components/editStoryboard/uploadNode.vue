<template>
  <div class="uploadNode">
    <Handle type="source" :position="Position.Right" />
    <div class="data">
      <div class="title ac">
        <i-pic theme="outline" size="16" fill="#000000" />
        <span style="margin-left: 5px; color: #4b4b4b">Image</span>
      </div>
      <div class="image">
        <t-image
          :src="currentImageUrl"
          fit="cover"
          :style="{
            width: '100%',
            height: '100%',
            borderRadius: '10px',
          }" />
        <div class="upload ac">
          <t-upload
            ref="referenceUploadRef"
            action=""
            v-model="referenceFileList"
            :autoUpload="false"
            theme="custom"
            accept="image/*"
            :max="1"
            @change="handleReferenceChange"
            :formatResponse="formatResponse"
            :showImageFileName="true"></t-upload>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Handle, Position, useVueFlow } from "@vue-flow/core";
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps<{
  id: string;
  data: {
    image?: string;
  };
}>();

const { nodes } = useVueFlow();
const referenceFileList = ref<any[]>([]);
const currentImageUrl = ref(props.data?.image || "");
const currentObjectUrl = ref<string | null>(null);

watch(
  () => props.data?.image,
  (newUrl) => {
    currentImageUrl.value = newUrl || "";
  },
);

function updateNodeImage(url: string) {
  currentImageUrl.value = url;
  if (!nodes?.value) return;

  nodes.value = nodes.value.map((node: any) => {
    if (node.id === props.id) {
      return {
        ...node,
        data: {
          ...node.data,
          image: url,
        },
      };
    }
    return node;
  });
}

function handleReferenceChange(files: any[]): void {
  referenceFileList.value = files;
  if (!files || !files.length) return;

  const file = files[0]?.raw || files[0];
  if (!file) return;

  // 验证文件类型
  if (file.type && !file.type.startsWith("image/")) {
    MessagePlugin.warning("请上传图片文件");
    return;
  }

  // 验证文件大小(限制 10MB)
  if (file.size && file.size > 10 * 1024 * 1024) {
    MessagePlugin.warning("图片大小不能超过 10MB");
    return;
  }

  const url = URL.createObjectURL(file);
  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value);
  }
  currentObjectUrl.value = url;
  updateNodeImage(url);
}

onBeforeUnmount(() => {
  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value);
  }
});

// 文件上传处理
function formatResponse(res: any) {
  if (res.status === "fail") {
    MessagePlugin.error("上传失败");
    return {
      success: false,
    };
  }
  MessagePlugin.success("上传成功");
  return {
    success: true,
    url: res.data.url,
  };
}
</script>

<style lang="scss" scoped>
.uploadNode {
  width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  .data {
    width: 100%;
    cursor: pointer;

    .title {
      height: 30px;
      padding: 5px;
    }
    .image {
      border: 1px solid #e5e5e5;
      height: 320px;
      width: 100%;
      position: relative;
      border-radius: 10px;
      .upload {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
      }
    }
  }
}
</style>
