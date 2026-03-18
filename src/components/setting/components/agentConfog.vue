<template>
  <div class="aiConfog">
    <div class="banner">
      <div class="content f ac jb">
        <div class="textContent ac">
          <i-good-two class="icon" theme="filled" size="24" fill="currentColor" />
          <span>使用 Toonflow 官方中转站点，支持一键填入配置，开箱即用，无需手动配置。</span>
        </div>
        <div class="btnList">
          <t-button @click="jumpToWebsite">
            进入网站
            <template #suffix>
              <i-share theme="outline" />
            </template>
          </t-button>
          <t-button>填入KEY</t-button>
        </div>
      </div>
    </div>

    <div class="cardGrid">
      <t-card hoverShadow v-for="(item, index) in modelData" :key="index" class="skillCard" @click="startConfig(item)">
        <div class="skillCardHeader">
          <div class="headerLeft">
            <t-avatar size="32px" v-if="getProviderLogo(item.icon)" :image="getProviderLogo(item.icon)!" />
            <t-avatar size="32px" v-else shape="round">
              <template #icon><i-help theme="outline" size="18" fill="currentColor" /></template>
            </t-avatar>
            <span class="skillName">{{ item.name }}</span>
          </div>
          <t-tag v-if="item.modelName && !item.disabled" theme="primary" variant="light" size="small">{{ item.modelName }}</t-tag>
          <t-tag v-else-if="item.disabled" variant="light" size="small">未开放</t-tag>
          <t-tag v-else-if="!item.disabled && !item.modelName" theme="warning" variant="light" size="small">未配置</t-tag>
        </div>
        <div class="skillCardBody">{{ item.desc }}</div>
      </t-card>
    </div>

    <!-- 模型配置弹窗 -->
    <t-dialog
      v-model:visible="modelDataShow"
      :header="currentItem?.name + ' 模型配置'"
      width="480px"
      :on-confirm="confirmConfig"
      confirm-btn="确认"
      cancel-btn="取消">
      <div class="dialogContent">
        <t-form label-align="left" :label-width="80">
          <t-form-item label="选择模型">
            <t-select v-model="currentModelId" placeholder="请选择" @change="onModelChange">
              <t-option-group v-for="(list, index) in vendorList" :key="index" :label="list.group">
                <t-option v-for="item in list.children" :value="item.value" :id="item" :key="item.value">
                  <div class="jb">
                    <div>{{ item.label }}</div>
                    <span>{{ item.type }}</span>
                  </div>
                </t-option>
              </t-option-group>
            </t-select>
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import providersLogo from "@/utils/ai/providersLogo";
import axios from "@/utils/axios";

interface ModelType {
  id: number;
  model: string;
  modelName: string;
  vendorId: number | null;
  name: string;
  icon: string;
  desc: string;
  disabled?: boolean;
}

interface VendorChild {
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
const vendorList = ref<VendorOption[]>([]);
const modelData = ref<ModelType[]>([]);

const modelDataShow = ref(false);
const currentItem = ref<ModelType | null>(null);
const currentModelId = ref<string>("");

function getProviderLogo(manufacturer: string) {
  if (!manufacturer) return null;
  const key = Object.keys(providersLogo).find((k) => k.toLowerCase() === manufacturer.toLowerCase());
  return key ? providersLogo[key as keyof typeof providersLogo] : null;
}

function startConfig(item: ModelType) {
  if (item.disabled) return MessagePlugin.warning("该功能暂未开放，敬请期待");
  currentItem.value = item;
  currentModelId.value = item.modelName;
  modelDataShow.value = true;
}

const currentVendorId = ref<number | null>(null);
const model = ref<string>("");
function onModelChange(value: any, context: any) {
  // context.option 即选中的子项，其上直接携带 vendorId
  currentVendorId.value = context?.option?.id.vendorId ?? null;
  model.value = context?.option?.id.label ?? "";
}

function confirmConfig() {
  if (currentItem.value) {
    currentItem.value.modelName = currentModelId.value;
    currentItem.value.vendorId = currentVendorId.value;
  }
  const data = {
    id: currentItem.value?.id,
    name: currentItem.value?.name,
    model: model.value,
    modelName: currentItem.value?.modelName,
    vendorId: currentItem.value?.vendorId,
    desc: currentItem.value?.desc,
  };
  axios
    .post("/setting/agentDeploy/deployAgentModel", data)
    .then(() => {
      window.$message.success("配置成功");
      getAgentDeploy();
    })
    .catch((err) => {
      MessagePlugin.error(`更新配置失败：${err.message}`);
    })
    .finally(() => {
      modelDataShow.value = false;
    });
}
//跳转官方网站
function jumpToWebsite() {
  window.open("https://api.toonflow.net", "_blank");
}

async function getVendorList() {
  axios
    .post("/setting/vendorConfig/getVendorList")
    .then((res) => {
      vendorList.value = res.data.map((i: any) => {
        return {
          group: i.name,
          id: i.id,
          children: i.models.map((j: any) => {
            return {
              label: j.name,
              vendorId: i.id,
              value: j.modelName,
              type: j.type == "video" ? "视频模型" : j.type === "text" ? "文本模型" : "图片模型",
            };
          }),
        };
      });
    })
    .catch((err) => {
      MessagePlugin.error(`获取供应商列表失败：${err.message}`);
    })
    .finally(() => {});
}
//查询Agent配置列表
function getAgentDeploy() {
  axios
    .post("/setting/agentDeploy/getAgentDeploy")
    .then((res) => {
      modelData.value = res.data.map((item: any) => {
        return {
          id: item.id,
          modelName: item.modelName,
          vendorId: item.vendorId,
          name: item.name,
          icon: item.icon,
          desc: item.desc,
          disabled: item.disabled,
        };
      });
    })
    .catch((err) => {
      MessagePlugin.error(`获取Agent配置列表失败：${err.message}`);
    })
    .finally(() => {});
}
onMounted(() => {
  getVendorList();
  getAgentDeploy();
});
</script>

<style lang="scss" scoped>
.aiConfog {
  display: flex;
  flex-direction: column;
  .banner {
    background-color: var(--td-success-color-focus);
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
    .content {
      width: 100%;
      .icon {
        color: var(--td-success-color);
        margin-right: 0.5em;
      }
      .btnList {
        & > * {
          margin-left: 8px;
        }
      }
    }
  }
}

.cardGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.skillCard {
  cursor: pointer;
  padding: 4px;
  display: flex;
  flex-direction: column;
}

.skillCardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .headerLeft {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .skillName {
    font-size: 15px;
    font-weight: 600;
  }
}

.skillCardBody {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  line-height: 1.5;
}

.dialogContent {
  padding: 8px 0;
}
</style>
<style lang="scss">
.t-select-option {
  display: block !important;
}
</style>
