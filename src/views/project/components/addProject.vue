<template>
  <div class="addProject">
    <t-dialog
      v-model:visible="addProjectShow"
      :header="$t('project.addProject.title')"
      width="30%"
      @confirm="handleOk"
      @close-btn-click="handleCancel"
      @cancel="handleCancel"
      :confirm-btn="$t('common.confirm')"
      :cancel-btn="$t('common.cancel')">
      <div class="data">
        <t-form :data="formState" label-align="left">
          <!-- <t-form-item label="项目类型">
            <t-select v-model="formState.projectType" placeholder="选择项目类型">
              <t-option key="基于小说原文" label="基于小说原文" value="基于小说原文" />
              <t-option key="基于剧本" label="基于剧本" value="基于剧本" />
            </t-select>
          </t-form-item> -->
          <t-form-item :label="$t('project.addProject.name')">
            <t-input v-model="formState.name" />
          </t-form-item>
          <t-form-item :label="$t('project.addProject.novelType')">
            <t-input v-model="formState.type" :placeholder="$t('project.addProject.novelTypePh')" />
          </t-form-item>
          <t-form-item :label="$t('project.addProject.artStyle')">
            <t-input v-model="formState.artStyle" style="cursor: pointer" readonly @click="selectArtStyle" :placeholder="$t('project.addProject.artStylePh')" />
          </t-form-item>
          <t-form-item :label="$t('project.addProject.videoRatio')">
            <t-select v-model="formState.videoRatio" :options="options" />
          </t-form-item>
          <t-form-item :label="$t('project.addProject.intro')">
            <t-textarea v-model="formState.intro" :autosize="{ minRows: 3, maxRows: 10 }"></t-textarea>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
    <artStyle v-model:artStyleShow="artStyleShow" v-model:artStyleData="formState.artStyle" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import artStyle from "./artStyle.vue";

const addProjectShow = defineModel<boolean>();

interface FormState {
  id: number;
  projectType: string;
  name: string;
  era: string;
  intro: string;
  type: string;
  artStyle: string;
  videoRatio: string;
  createTime: number;
  userId: number;
}

const formState = ref<FormState>({
  id: 0,
  projectType: "",
  name: "",
  intro: "",
  type: "",
  artStyle: "",
  era: "",
  videoRatio: "",
  createTime: 0,
  userId: 0,
});

const emit = defineEmits(["getProjects"]);
function resetForm() {
  formState.value = {
    id: 0,
    projectType: "",
    name: "",
    intro: "",
    type: "",
    artStyle: "",
    era: "",
    videoRatio: "",
    createTime: 0,
    userId: 0,
  };
}
const options = ref([
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
]);
function handleCancel() {
  addProjectShow.value = false;
  resetForm();
}
function handleOk() {
  axios
    .post("/project/addProject", {
      projectType: formState.value.projectType ? formState.value.projectType : "基于小说原文",
      name: formState.value.name ? formState.value.name : "New Project",
      intro: formState.value.intro ? formState.value.intro : "",
      type: formState.value.type ? formState.value.type : "",
      artStyle: formState.value.artStyle ? formState.value.artStyle : "",
      videoRatio: formState.value.videoRatio ? formState.value.videoRatio : "16:9",
    })
    .then(({ data }) => {
      MessagePlugin.success(t("project.addProject.successMsg"));
      emit("getProjects");
      resetForm();
    })
    .catch(() => {
      MessagePlugin.error(t("project.addProject.errorMsg"));
    })
    .finally(() => {
      addProjectShow.value = false;
    });
}

const artStyleShow = ref<boolean>(false);

function selectArtStyle() {
  artStyleShow.value = true;
}
</script>

<style lang="scss" scoped></style>
