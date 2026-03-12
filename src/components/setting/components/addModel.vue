<template>
  <div class="addModel">
    <t-dialog
      :visible.sync="addModelShow"
      :closable="false"
      header="添加模型"
      :maskClosable="false"
      wrapClassName="no-header-margin"
      dialogClass="custom-modal"
      @close-btn-click="handleCancel"
      @confirm="onConfirm"
      @cancel="handleCancel">
      <div class="data">
        <t-form :data="formData" :labelWidth="100" labelAlign="top">
          <t-form-item name="modelName" label="模型名称">
            <t-select v-model="formData.modelName">
              <t-option key="apple" label="Apple" value="apple" />
              <t-option key="orange" value="orange">Orange</t-option>
              <t-option key="banana" label="Banana" value="banana" />
            </t-select>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
const addModelShow = defineModel({
  type: Boolean,
  default: false,
});
const props = defineProps<{
  formData: {
    modelName: string;
  };
}>();
function handleCancel() {
  addModelShow.value = false;
}
function onConfirm() {
  console.log("confirm", props.formData.modelName);
  addModelShow.value = false;
}
</script>

<style lang="scss" scoped></style>
