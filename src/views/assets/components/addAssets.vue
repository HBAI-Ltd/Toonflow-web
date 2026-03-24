<template>
  <div class="addAssets">
    <t-dialog
      v-model:visible="addAssetsShow"
      :closable="false"
      width="40vw"
      :header="props.title"
      :maskClosable="false"
      @close-btn-click="handleCancel"
      @confirm="onConfirm"
      @cancel="handleCancel">
      <div class="data">
        <t-form :data="props.formData" :rules="rules" ref="formRef">
          <t-form-item label="名称" name="name">
            <t-input v-model="props.formData.name" placeholder="请输入名称"></t-input>
          </t-form-item>
          <t-form-item label="描述" name="describe">
            <t-textarea v-model="props.formData.describe" placeholder="请输入描述"></t-textarea>
          </t-form-item>
          <t-form-item label="备注" name="remark">
            <t-input v-model="props.formData.remark" placeholder="请输入备注"></t-input>
          </t-form-item>
          <t-form-item label="提示词" name="prompt" v-if="props.type !== 'clip'">
            <t-textarea v-model="props.formData.prompt" :autosize="{ minRows: 3, maxRows: 5 }" placeholder="请输入提示词"></t-textarea>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());
import { MessagePlugin } from "tdesign-vue-next";
const props = defineProps<{
  type: "role" | "tool" | "scene" | "clip";
  title: string;
  formData: {
    id: number;
    name: string;
    describe: string;
    remark: string;
    prompt: string;
  };
}>();
const addAssetsShow = defineModel<boolean>({
  default: false,
});
const rules = ref<{}>({
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  describe: [{ required: true, message: "请输入详情", trigger: "blur" }],
  remark: [{ required: true, message: "请输入备注", trigger: "blur" }],
});
function handleCancel() {
  addAssetsShow.value = false;
}
const formRef = ref();
const emit = defineEmits(["getFilteredData"]);
function onConfirm() {
  formRef.value?.validate().then(async () => {
    if (props.formData.id !== 0) {
      await axios
        .post(`/assets/updateAssets`, {
          id: props.formData.id,
          name: props.formData.name,
          describe: props.formData.describe,
          remark: props.formData.remark,
          prompt: props.formData.prompt,
        })
        .then(() => {
          MessagePlugin.success("资产更新成功");
          emit("getFilteredData");
          addAssetsShow.value = false;
        });
      return;
    } else {
      axios
        .post(`/assets/addAssets`, {
          name: props.formData.name,
          describe: props.formData.describe,
          remark: props.formData.remark,
          type: props.type,
          projectId: project.value?.id,
          prompt: props.formData.prompt,
        })
        .then(() => {
          MessagePlugin.success("资产添加成功");
          emit("getFilteredData");
          addAssetsShow.value = false;
        });
    }
  });
}
</script>

<style lang="scss" scoped>
.addAssets {
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
}
</style>
