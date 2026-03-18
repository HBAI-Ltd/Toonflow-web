<template>
  <t-select v-model="selectValue" placeholder="请选择">
    <t-option-group v-for="(list, index) in optionsData" :key="index" :label="list.group" @change="onChange">
      <t-option v-for="item in list.children" :key="item.id" :value="`${item.id}:${item.label}`" :label="item.label">
        <div class="jb">
          <div>{{ item.label }}</div>
          <span>{{ item.type }}</span>
        </div>
      </t-option>
    </t-option-group>
  </t-select>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
interface VendorChild {
  id: number;
  label: string;
  value: string;
  vendorId: number;
  type: string;
}

interface VendorOption {
  group: string;
  id: number;
  children: VendorChild[];
}
const selectValue = defineModel({
  type: String,
  default: "",
});
const props = defineProps({
  type: {
    type: String,
    default: "",
  },
});
function onChange(value: any, context: any) {
  selectValue.value = context.option.id.value;
}
const optionsData = ref<VendorOption[]>([]);
onMounted(() => {
  handleModelChange();
});
//获取模型选择API数据
function handleModelChange() {
  axios
    .post("/modelSelect/getModelList", { type: props.type })
    .then((response) => {
      const groupMap = new Map<string, VendorOption>();
      response.data.forEach((item: any) => {
        const groupKey = item.name;
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            group: groupKey,
            id: item.id,
            children: [],
          });
        }
        groupMap.get(groupKey)!.children.push({
          id: item.id,
          label: item.label,
          value: item.value,
          vendorId: item.vendorId,
          type: item.type == 'image' ? "图像生成" : item.type == 'text' ? "文本生成" : item.type,
        });
      });
      optionsData.value = Array.from(groupMap.values());
    })
    .catch((error) => {
      console.error("获取模型数据失败:", error);
    });
}
</script>

<style lang="scss" scoped></style>
