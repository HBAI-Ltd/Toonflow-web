<template>
  <t-dialog v-model:visible="show" :footer="false" :header="false" width="680px" :close-on-overlay-click="false" placement="center">
    <div class="helloGuide">
      <!-- 欢迎首页 -->
      <template v-if="currentStep === 0">
        <div class="welcomePage">
          <img src="@/assets/logo.png" alt="ToonFlow Logo" class="welcomeLogo" />
          <h1 class="welcomeTitle">{{ $t("hello.welcomeTitle") }}</h1>
          <p class="welcomeDesc">{{ $t("hello.welcomeDesc") }}</p>
          <t-button theme="primary" size="large" @click="currentStep = 1">{{ $t("hello.startConfig") }}</t-button>
          <t-button variant="text" size="small" style="margin-top: 12px" @click="handleSkip">{{ $t("hello.skip") }}</t-button>
          <div class="langBtn">
            <t-dropdown :options="langOptions" trigger="click" @click="handleChangeLang" :maxColumnWidth="150">
              <t-button shape="circle" theme="default" size="large">
                <template #icon>
                  <i-translate theme="outline" size="20" />
                </template>
              </t-button>
            </t-dropdown>
          </div>
        </div>
      </template>

      <!-- 配置步骤 -->
      <template v-else>
        <t-steps :current="currentStep - 1" class="guideSteps">
          <t-step-item :title="$t('hello.configModel')" />
          <t-step-item :title="$t('hello.configData')" />
          <t-step-item :title="$t('hello.startUse')" />
        </t-steps>

        <div class="stepContent">
          <!-- Step 1: 配置模型服务 -->
          <div v-if="currentStep === 1" class="stepItem">
            <div class="stepIcon">
              <t-icon name="server" size="48px" />
            </div>
            <h2 class="stepTitle">{{ $t("hello.configModelTitle") }}</h2>
            <p class="stepDesc">{{ $t("hello.configModelDesc") }}</p>
            <div class="stepTip">
              <t-alert theme="info" :message="$t('hello.configModelTip')" />
            </div>
            <t-button theme="primary" size="large" @click="openVendorConfig">
              <template #icon><t-icon name="setting" /></template>
              {{ $t("hello.configModelBtn") }}
            </t-button>
          </div>

          <!-- Step 2: 配置 Agent -->
          <div v-if="currentStep === 2" class="stepItem">
            <div class="stepIcon">
              <t-icon name="relativity" size="48px" />
            </div>
            <h2 class="stepTitle">{{ $t("hello.configAgentTitle") }}</h2>
            <p class="stepDesc">{{ $t("hello.configAgentDesc") }}</p>
            <div class="stepTip">
              <t-alert theme="info" :message="$t('hello.configAgentTip')" />
            </div>
            <t-button theme="primary" size="large" @click="openAgentConfig">
              <template #icon><t-icon name="setting" /></template>
              {{ $t("hello.configAgentBtn") }}
            </t-button>
          </div>

          <!-- Step 3: 完成 -->
          <div v-if="currentStep === 3" class="stepItem">
            <div class="stepIcon">
              <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
            </div>
            <h2 class="stepTitle">{{ $t("hello.finishTitle") }}</h2>
            <p class="stepDesc">{{ $t("hello.finishDesc") }}</p>
            <div class="qrcodeBox">
              <p class="qrcodeLabel">{{ $t("hello.qrcodeLabel") }}</p>
              <t-qrcode value="https://work.weixin.qq.com/u/vc36adcc89845edcbe?v=5.0.3.63936&bb=85b8d228e8" level="Q" type="svg" />
            </div>
            <div class="githubBox">
              <p class="qrcodeLabel">{{ $t("hello.githubLabel")}}</p>
              <t-button theme="danger" size="large" @click="jumpGithub">
                <template #icon><t-icon name="logo-github" /></template>
                Star on GitHub
              </t-button>
            </div>
          </div>
        </div>
        <!-- 底部按钮 -->
        <div class="guideFooter">
          <t-button v-if="currentStep > 1" variant="outline" @click="currentStep--">{{ $t("hello.prevStep") }}</t-button>
          <div class="footerRight">
            <t-button v-if="currentStep < 3" variant="text" @click="handleSkip">{{ $t("hello.skip") }}</t-button>
            <t-button v-if="currentStep < 3" theme="primary" @click="currentStep++">{{ $t("hello.nextStep") }}</t-button>
            <t-button v-if="currentStep === 3" theme="primary" @click="handleFinish">{{ $t("hello.finish") }}</t-button>
          </div>
        </div>
      </template>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import JSConfetti from "js-confetti";
import settingStore from "@/stores/setting";
import { languageList, cachedLocale } from "@/locales";
const { showSetting, activeMenu, isElectron } = storeToRefs(settingStore());

const { locale } = useI18n();
const langOptions = languageList.map((item) => ({
  content: item.label,
  value: item.value,
}));
const handleChangeLang = (data: any) => {
  locale.value = data.value;
  cachedLocale.value = data.value;
};

const guideDone = useLocalStorage("helloGuideDone", false);
const show = ref(!guideDone.value);
const currentStep = ref(0);

function openVendorConfig() {
  activeMenu.value = "vendorConfig";
  showSetting.value = true;
}

function openAgentConfig() {
  activeMenu.value = "agentConfog";
  showSetting.value = true;
}

function handleSkip() {
  guideDone.value = true;
  show.value = false;
}

function handleFinish() {
  guideDone.value = true;
  show.value = false;
  const jsConfetti = new JSConfetti();
  jsConfetti.addConfetti();
}

async function jumpGithub() {
  if (isElectron.value) {
    await fetch("toonflow://openurlwithbrowser?url=https://github.com/HBAI-Ltd/Toonflow-app");
  } else {
    window.open("https://github.com/HBAI-Ltd/Toonflow-app");
  }
}
</script>

<style lang="scss" scoped>
.helloGuide {
  padding: 24px 16px;

  .welcomePage {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0 24px;
    position: relative;

    .langBtn {
      position: absolute;
      bottom: 0;
      right: 0;
    }

    .welcomeLogo {
      width: 120px;
      height: 120px;
      object-fit: contain;
      margin-bottom: 24px;
    }

    .welcomeTitle {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 12px;
    }

    .welcomeDesc {
      color: var(--td-text-color-secondary);
      font-size: 15px;
      margin: 0 0 32px;
    }
  }

  .guideSteps {
    margin-bottom: 32px;
  }

  .stepContent {
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;

    .stepItem {
      text-align: center;
      max-width: 480px;

      .stepIcon {
        margin-bottom: 16px;
        color: var(--td-brand-color);
      }

      .stepTitle {
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 12px;
      }

      .stepDesc {
        color: var(--td-text-color-secondary);
        font-size: 14px;
        line-height: 1.8;
        margin: 0 0 20px;
      }

      .stepTip {
        margin-bottom: 20px;
      }

      .qrcodeBox {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;

        .qrcodeLabel {
          color: var(--td-text-color-secondary);
          font-size: 13px;
          margin-bottom: 8px;
        }
      }

      .githubBox {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
    }
  }

  .guideFooter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    border-top: 1px solid var(--td-component-stroke);
    padding-top: 16px;

    .footerRight {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
  }
}
</style>
