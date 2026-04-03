<template>
  <div class="aiConfog" v-loading="loading">
    <div class="banner">
      <div class="content f ac jb">
        <div class="textContent ac">
          <i-good-two class="icon" theme="filled" size="24" fill="currentColor" />
          <span>{{ $t("settings.agent.bannerDesc") }}</span>
        </div>
        <div class="btnList f w">
          <t-button @click="jumpToWebsite">
            {{ $t("settings.agent.visitWebsite") }}
            <template #suffix>
              <i-share theme="outline" />
            </template>
          </t-button>
          <div class="rightBtnList f nw">
            <t-button @click="oneClickToFillIn">{{ $t("settings.agent.oneClickFill") }}</t-button>
          </div>
        </div>
      </div>
    </div>

    <div class="cardGrid">
      <t-card hoverShadow v-for="(item, index) in modelData" :key="index" class="skillCard" @click="startConfig(item)">
        <div class="skillCardHeader">
          <div class="headerLeft">
            <t-avatar v-if="getDisplayLogo(item)" :image="getDisplayLogo(item)!" shape="round" />
            <t-avatar v-else shape="round" class="fallbackAvatar">
              {{ getFallbackText(item.name) }}
            </t-avatar>
            <span class="skillName">{{ item.name }}</span>
          </div>
          <t-tag v-if="item.model && !item.disabled" theme="primary" variant="light" size="small">{{ item.model }}</t-tag>
          <t-tag v-else-if="item.disabled" variant="light" size="small">{{ $t("settings.agent.notOpen") }}</t-tag>
          <t-tag v-else-if="!item.disabled && !item.model" theme="warning" variant="light" size="small">
            {{ $t("settings.agent.notConfigured") }}
          </t-tag>
        </div>
        <div class="skillCardBody">{{ item.desc }}</div>
      </t-card>
    </div>

    <!-- 模型配置弹窗 -->
    <t-dialog
      v-model:visible="modelDataShow"
      :header="currentItem?.name + ' ' + $t('settings.agent.modelConfig')"
      width="480px"
      :on-confirm="confirmConfig"
      :confirm-btn="$t('settings.agent.confirm')"
      :cancel-btn="$t('settings.agent.cancel')">
      <div class="dialogContent">
        <t-form label-align="left" :label-width="70">
          <t-form-item :label="$t('settings.agent.selectModel')">
            <modelSelect v-model="selectValue" type="text" />
          </t-form-item>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import modelSelect from "@/components/modelSelect.vue";
import providersLogo from "@/utils/ai/providersLogo";
import axios from "@/utils/axios";
import settingStore from "@/stores/setting";
const { isElectron } = storeToRefs(settingStore());

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

const modelProviderRules: Array<{ pattern: RegExp; provider: keyof typeof providersLogo }> = [
  { pattern: /gpt|o1|o3|o4|openai/i, provider: "openai" },
  { pattern: /claude|anthropic/i, provider: "anthropic" },
  { pattern: /deepseek/i, provider: "deepSeek" },
  { pattern: /gemini|veo/i, provider: "gemini" },
  { pattern: /qwen|qwq|tongyi|通义|wanx|万相|wan/i, provider: "qwen" },
  { pattern: /glm|zhipu|智谱/i, provider: "zhipu" },
  { pattern: /doubao|seedream|seedance|volc/i, provider: "volcengine" },
  { pattern: /kling|可灵/i, provider: "kling" },
  { pattern: /vidu/i, provider: "vidu" },
  { pattern: /runninghub/i, provider: "runninghub" },
  { pattern: /grok|xai|grsai/i, provider: "grsai" },
];

function getProviderLogo(manufacturer: string) {
  if (!manufacturer) return null;
  const key = Object.keys(providersLogo).find((k) => k.toLowerCase() === manufacturer.toLowerCase());
  return key ? providersLogo[key as keyof typeof providersLogo] : null;
}

function inferProviderByModel(modelName?: string, model?: string) {
  const source = `${modelName || ""} ${model || ""}`.trim();
  if (!source) return null;
  const matchedRule = modelProviderRules.find((rule) => rule.pattern.test(source));
  return matchedRule ? providersLogo[matchedRule.provider] : null;
}

function getDisplayLogo(item: ModelType) {
  return getProviderLogo(item.icon) || inferProviderByModel(item.modelName, item.model);
}

function getFallbackText(name: string) {
  return name?.slice(0, 1) || "A";
}

function startConfig(item: ModelType) {
  if (item.disabled) return window.$message.warning($t("settings.agent.msg.notAvailable"));
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
    vendorId: selectValue.value.split(":")[0],
    desc: currentItem.value?.desc,
  };
  axios
    .post("/setting/agentDeploy/deployAgentModel", data)
    .then(() => {
      window.$message.success($t("settings.agent.msg.configSuccess"));
      getAgentDeploy();
    })
    .catch((err) => {
      window.$message.error(`${$t("settings.agent.msg.updateConfigFailed")}${err.message}`);
    })
    .finally(() => {
      modelDataShow.value = false;
    });
}
//跳转官方网站
async function jumpToWebsite() {
  if (isElectron.value) {
    await fetch(`toonflow://openurlwithbrowser?url=https://api.toonflow.net`);
  } else {
    window.open("https://api.toonflow.net", "_blank");
  }
}
const loading = ref(false);

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
      window.$message.error(`${$t("settings.agent.msg.getAgentListFailed")}${err.message}`);
    })
    .finally(() => {});
}
onMounted(() => {
  getAgentDeploy();
});
//一键填入
async function oneClickToFillIn() {
  loading.value = true;
  await getVendorList();
  const toonflow = vendorList.value.find((item) => item.id === "toonflow");
  if (!toonflow) {
    window.$message.error($t("settings.agent.msg.toonflowNotFound"));
    loading.value = false;
    return;
  }
  submitAgentSetKey("")
  return
  // if (!toonflow.inputValues.apiKey) {
  //   // key 不存在，弹窗让用户填入
  //   loading.value = false;
  //   const inputKey = ref("");
  //   const dialogInstance = DialogPlugin({
  //     header: $t("settings.agent.fillKeyHeader"),
  //     body: () =>
  //       h("div", { style: "padding: 8px 0" }, [
  //         h(resolveComponent("t-input") as any, {
  //           modelValue: inputKey.value,
  //           "onUpdate:modelValue": (val: string) => (inputKey.value = val),
  //           placeholder: $t("settings.agent.keyPlaceholder"),
  //           type: "password",
  //         }),
  //       ]),
  //     confirmBtn: $t("settings.agent.confirm"),
  //     cancelBtn: $t("settings.agent.cancel"),
  //     onConfirm: () => {
  //       if (!inputKey.value) {
  //         window.$message.warning($t("settings.agent.msg.enterKey"));
  //         return;
  //       }
  //       dialogInstance.hide();
  //       submitAgentSetKey(inputKey.value);
  //     },
  //     onClose: () => {
  //       dialogInstance.hide();
  //     },
  //   });
  //   return;
  // }
  // submitAgentSetKey(toonflow.inputValues.apiKey);
}

function submitAgentSetKey(key: string) {
  loading.value = true;
  axios
    .post("/setting/agentDeploy/agentSetKey", { key })
    .then(() => {
      window.$message.success($t("settings.agent.msg.configSuccess"));
      getAgentDeploy();
    })
    .catch((err) => {
      window.$message.error(`${$t("settings.agent.msg.updateConfigFailed")}${err.message}`);

    })
    .finally(() => {
      modelDataShow.value = false;
      loading.value = false;
    });
}

// ── 供应商列表 ──
interface VendorItem {
  id: string; //供应商唯一标识，必须全局唯一
  inputValues: Record<string, string>;
}

const vendorList = ref<VendorItem[]>([]);

async function getVendorList() {
  try {
    const res = await axios.post("/setting/vendorConfig/getVendorList");
    vendorList.value = res.data.map((item: any) => {
      return {
        ...item,
        enable: item.enable == 1 ? true : false,
      };
    });
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.getVendorListFailed")}${err.message}`);
  }
}
</script>

<style lang="scss" scoped>
.aiConfog {
  display: flex;
  flex-direction: column;
  .banner {
    background-color: var(--td-success-color-focus);
    padding: 16px;
    margin-bottom: 16px;
    border-radius: 4px;
    .content {
      width: 100%;
      .icon {
        color: var(--td-success-color);
        margin-right: 0.5em;
      }
      .btnList {
        .rightBtnList {
          & > * {
            margin-left: 0.5em;
          }
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
  .fallbackAvatar {
    background: var(--td-brand-color-light);
    color: var(--td-brand-color);
    font-size: 14px;
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
