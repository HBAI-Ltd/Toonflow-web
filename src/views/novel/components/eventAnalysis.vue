<template>
  <div class="">
    <div v-if="!eventDatas.length">
      <t-empty :title="$t('workbench.novel.analysis.analyzeFirst')">
        <template #action>
          <t-button @click="startEventAnalysis">{{ $t('workbench.novel.analysis.startAnalysis') }}</t-button>
        </template>
      </t-empty>
    </div>
    <div>
      <t-collapse>
        <t-collapse-panel v-for="item in novelIndexData" defaultExpandAll :key="item.id" :header="$t('workbench.novel.analysis.chapterHeader', { index: item.index, name: item.chapter })">
          <template #headerRightContent v-if="!item?.compluted">
            <t-loading :text="$t('workbench.novel.analysis.analyzing')" size="small"></t-loading>
          </template>
          <div>
            <div v-for="sub in item.eventData">
              {{ sub }}
            </div>
          </div>
        </t-collapse-panel>
      </t-collapse>
    </div>
    <div style="margin-top: 16px; text-align: right">
      <t-button variant="outline" @click="activeKey = 'To1'">{{ $t('workbench.novel.import.prevStep') }}</t-button>
      <t-button variant="outline" @click="activeKey = 'To3'">{{ $t('workbench.novel.import.nextStep') }}</t-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import { ref } from "vue";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

const eventDatas = ref([]);
const activeKey = defineModel({
  default: "To3",
});
const novelIndexData = ref<
  {
    id: number;
    index: number;
    chapter: string;
    compluted?: boolean;
    eventData?: any[];
  }[]
>([]);
async function startEventAnalysis() {
  await getNovelData();
  axios
    .post(
      "/novel/event/eventAnalysis",
      {
        projectId: project.value?.id!,
        novelIndexData: novelIndexData.value,
      },
      {
        responseType: "stream",
      },
    )
    .then((res) => {
      eventDatas.value = res.data;
    });
}
async function getNovelData() {
  const { data } = await axios.post("/novel/getNovelIndex", {
    projectId: project.value?.id!,
  });
  novelIndexData.value = data;
}
</script>

<style lang="scss" scoped></style>
