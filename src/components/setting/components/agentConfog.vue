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
          <t-button @click="fillInKey" v-if="!fillIn">填入KEY</t-button>
          <t-button @click="oneClickToFillIn" v-if="fillIn">一键填入</t-button>
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
          <t-tag v-if="item.model && !item.disabled" theme="primary" variant="light" size="small">{{ item.model }}</t-tag>
          <t-tag v-else-if="item.disabled" variant="light" size="small">未开放</t-tag>
          <t-tag v-else-if="!item.disabled && !item.model" theme="warning" variant="light" size="small">未配置</t-tag>
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
        <t-form label-align="left" :label-width="70">
          <t-form-item label="选择模型">
            <modelSelect v-model="selectValue" type="all" />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
    <t-dialog v-model:visible="testKeyShow" header="填入Toonflow平台的官方KEY" width="480px">
      <div class="testKey">
        <t-input v-model="key" placeholder="请输入 KEY" style="margin-top: 20px" />
      </div>
      <template #footer>
        <t-button variant="outline" @click="testKeyShow = false">取消</t-button>
        <t-button @click="keep" :loading="loading">保存</t-button>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import modelSelect from "@/components/modelSelect.vue";
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

const modelData = ref<ModelType[]>([]);

const modelDataShow = ref(false);
const currentItem = ref<ModelType | null>(null);
const selectValue = ref<string>("");

function getProviderLogo(manufacturer: string) {
  if (!manufacturer) return null;
  const key = Object.keys(providersLogo).find((k) => k.toLowerCase() === manufacturer.toLowerCase());
  return key ? providersLogo[key as keyof typeof providersLogo] : null;
}

function startConfig(item: ModelType) {
  if (item.disabled) return MessagePlugin.warning("该功能暂未开放，敬请期待");
  currentItem.value = item;
  selectValue.value = item.modelName;
  modelDataShow.value = true;
}

const currentVendorId = ref<number | null>(null);
function confirmConfig() {
  if (currentItem.value) {
    currentItem.value.modelName = selectValue.value;
    currentItem.value.vendorId = currentVendorId.value;
  }
  const data = {
    id: currentItem.value?.id,
    name: currentItem.value?.name,
    model: selectValue.value.split(":")[1] || currentItem.value?.model,
    modelName: currentItem.value?.modelName,
    vendorId: Number(selectValue.value.split(":")[0]),
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
const testKeyShow = ref(false);
const key = ref("");
//一键填入KEY
function fillInKey() {
  testKeyShow.value = true;
}
const loading = ref(false);
const fillIn = ref(false);
//测试模型
function testModel() {
  axios
    .post("/setting/vendorConfig/modelTest", {
      type: "text",
      modelName: "gpt-4.1",
      apiKey: "",
      id: 1,
    })
    .then(() => {
      loading.value = false;
      MessagePlugin.success("KEY有效，已成功连接Toonflow平台");
      testKeyShow.value = false;
      fillIn.value = true;
    })
    .catch((err) => {
      loading.value = false;
      MessagePlugin.error(`KEY无效，请检查后重新输入：${err.message}`);
    });
}
function keep() {
  if (!key.value) {
    MessagePlugin.warning("请输入 KEY");
    return false;
  }
  loading.value = true;
  axios
    .post("/setting/agentDeploy/updateKey", { id: 1, key: key.value })
    .then(() => {
      testModel();
    })
    .catch((err) => {
      MessagePlugin.error(`保存失败：${err.message}`);
    });
}
//查询Agent配置列表
function getAgentDeploy() {
  axios
    .post("/setting/agentDeploy/getAgentDeploy")
    .then((res) => {
      modelData.value = res.data.map((item: any) => {
        return {
          id: item.id,
          model: item.model,
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
  getAgentDeploy();
});
//一键填入
function oneClickToFillIn() {
  const targets = ["剧本Agent", "分镜Agent", "资产AI", "润色AI"];
  modelData.value.forEach((item) => {
    if (targets.includes(item.name)) {
      item.modelName = "1:gpt-4.1";
      item.model = "gpt-4.1";
      item.vendorId = 1;
    }
  });
  for (let item of modelData.value) {
    axios
      .post("/setting/agentDeploy/deployAgentModel", {
        id: item.id,
        name: item.name,
        model: item.model,
        modelName: item.modelName,
        vendorId: item.vendorId,
        desc: item.desc,
      })
      .then(() => {
        MessagePlugin.success("配置成功");
        getAgentDeploy();
      })
      .catch((err) => {
        MessagePlugin.error(`更新配置失败：${err.message}`);
      })
      .finally(() => {
        modelDataShow.value = false;
      });
  }
}
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
