<template>
  <div class="about">
    <t-card bordered :style="{ width: '100%' }" class="logoCard">
      <div class="f">
        <img src="@/assets/logo.png" alt="ToonFlow Logo" class="logo" />
        <div class="appName">
          <div class="name">ToonFlow</div>
          <div class="data">{{ $t("settings.about.slogan") }}</div>
          <div class="version">
            <t-tag theme="primary" shape="round" size="small" style="padding: 10px">v{{ version }}</t-tag>
          </div>
        </div>
        <div class="renew ac">
          <t-button theme="primary" @click="checkUpdate">
            <template #icon>
              <i-refresh theme="outline" size="18" />
            </template>
            <span style="margin-left: 5px">{{ $t("settings.about.checkUpdate") }}</span>
          </t-button>
        </div>
      </div>
    </t-card>
    <div class="codeRepository">
      <span>{{ $t("settings.about.codeRepository") }}</span>
      <t-card bordered :style="{ width: '100%' }" class="logoCard">
        <div class="ac jb" style="cursor: pointer" @click="openLink('https://github.com/HBAI-Ltd/Toonflow-app')">
          <div class="f">
            <div class="github">
              <i-github theme="outline" size="22" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">{{ $t("settings.about.githubRepo") }}</span>
              </div>
              <div>
                <span style="font-size: 12px; color: #666">https://github.com/HBAI-Ltd/Toonflow-app</span>
              </div>
            </div>
          </div>
          <i-right theme="outline" size="18" />
        </div>
        <t-divider></t-divider>
        <div class="ac jb" style="cursor: pointer" @click="openLink('https://gitee.com/HBAI-Ltd/Toonflow-app')">
          <div class="f">
            <div class="gitee">
              <i-code theme="outline" size="20" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">{{ $t("settings.about.giteeRepo") }}</span>
              </div>
              <div>
                <span style="font-size: 12px; color: #666">https://gitee.com/HBAI-Ltd/Toonflow-app</span>
              </div>
            </div>
          </div>
          <i-right theme="outline" size="18" />
        </div>
      </t-card>
    </div>
    <div class="license">
      <span>{{ $t("settings.about.license") }}</span>
      <t-card bordered :style="{ width: '100%' }" class="logoCard">
        <div class="ac jb" style="cursor: pointer">
          <div class="f">
            <div class="data">
              <i-notes theme="outline" size="20" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">Apache-2.0 License</span>
              </div>
              <div>
                <span style="font-size: 12px; color: #666">{{ $t("settings.about.licenseDesc") }}</span>
              </div>
            </div>
          </div>
          <i-right theme="outline" size="18" />
        </div>
      </t-card>
    </div>

    <!-- 更新弹窗 -->
    <t-dialog
      v-model:visible="updateDialogVisible"
      :header="false"
      :confirm-btn="null"
      :cancel-btn="null"
      :close-on-overlay-click="false"
      width="600px">
      <div class="updateDialog">
        <!-- 顶部图标 + 标题 -->
        <div class="updateHeader">
          <div class="updateIcon">
            <i-refresh theme="outline" size="28" style="color: var(--td-brand-color)" />
          </div>
          <div class="updateTitle">
            {{
              updateInfo.needUpdate
                ? $t("settings.about.updateAvailable")
                : updateInfo.latestVersion
                  ? $t("settings.about.noUpdate")
                  : $t("settings.about.selectUpdateSource")
            }}
          </div>
        </div>

        <!-- 版本对比 -->
        <div class="versionCompare" v-if="updateInfo.latestVersion">
          <div class="versionCard current">
            <span class="versionLabel">{{ $t("settings.about.currentVersion") }}</span>
            <t-tag theme="default" shape="round" size="medium">v{{ version }}</t-tag>
          </div>
          <div class="arrow">
            <i-right theme="outline" size="20" style="color: var(--td-brand-color)" />
          </div>
          <div class="versionCard latest">
            <span class="versionLabel">{{ $t("settings.about.latestVersionLabel") }}</span>
            <t-tag theme="success" shape="round" size="medium">v{{ updateInfo.latestVersion }}</t-tag>
          </div>
        </div>
        <div class="versionTime" v-if="formattedUpdateTime">
          <span class="versionTimeLabel">更新时间</span>
          <span class="versionTimeValue">{{ formattedUpdateTime }}</span>
        </div>

        <!-- 更新源选择 -->
        <div class="sourceSelect">
          <span class="sourceTitle">{{ $t("settings.about.selectUpdateSource") }}</span>
          <div class="sourceCards">
            <div
              class="sourceCard"
              v-for="source in updateSources"
              :key="source.value"
              :class="{ active: updateSource === source.value, disabled: source.disabled }"
              @click="!source.disabled && (updateSource = source.value)">
              <div class="sourceIcon" :class="source.iconClass" :style="source.iconBg ? { background: source.iconBg } : undefined">
                <img v-if="source.iconType === 'image'" :src="source.iconSrc" :alt="source.label" style="width: 22px; height: 22px" />
                <i-github v-else-if="source.iconName === 'github'" theme="outline" size="22" />
                <i-code v-else-if="source.iconName === 'code'" theme="outline" size="22" />
              </div>
              <span class="sourceName">{{ source.label }}</span>
              <div class="checkMark" v-if="updateSource === source.value">
                <i-check-one theme="filled" size="18" style="color: var(--td-brand-color)" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px">
          <t-button variant="outline" @click="updateDialogVisible = false" :disabled="updateLoading">
            {{ $t("settings.about.cancel") }}
          </t-button>
          <t-button theme="primary" @click="updateInfo.needUpdate ? confirmUpdate() : checkUpdateWithSource()" :loading="updateLoading">
            <template #icon><i-refresh theme="outline" size="16" /></template>
            {{ updateInfo.needUpdate ? $t("settings.about.confirmUpdate") : $t("settings.about.checkUpdate") }}
          </t-button>
        </div>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import atomgitLogo from "@/assets/atomgit.svg";
import dayjs from "dayjs";
import toonflowLogo from "@/assets/logo.svg";
import store from "@/stores/index";
import { DialogPlugin, MessagePlugin } from "tdesign-vue-next";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { version } = storeToRefs(store());

import settingStore from "@/stores/setting";
const { isElectron } = storeToRefs(settingStore());

type UpdateSource = "github" | "gitee" | "toonflow" | "atomgit";

const updateDialogVisible = ref(false);
const updateSource = ref<UpdateSource>("toonflow");
const updateSources = ref([
  {
    value: "toonflow" as UpdateSource,
    label: "ToonFlow",
    iconType: "image" as const,
    iconSrc: toonflowLogo,
    iconClass: "toonflow",
    iconBg: "#ececec",
    disabled: false,
  },
  {
    value: "github" as UpdateSource,
    label: t("settings.about.github"),
    iconType: "component" as const,
    iconName: "github" as const,
    iconClass: "github",
    disabled: true,
  },
  {
    value: "atomgit" as UpdateSource,
    label: "AtomGit",
    iconType: "image" as const,
    iconSrc: atomgitLogo,
    iconClass: "atomgit",
    iconBg: "#f9f9fb",
    disabled: true,
  },
  {
    value: "gitee" as UpdateSource,
    label: t("settings.about.gitee"),
    iconType: "component" as const,
    iconName: "code" as const,
    iconClass: "gitee",
    disabled: true,
  },
]);
const updateLoading = ref(false);
const updateInfo = ref({
  needUpdate: false,
  latestVersion: "",
  reinstall: false,
  time: 0,
  url: "",
});

const formattedUpdateTime = computed(() => {
  if (!updateInfo.value.time) {
    return "";
  }

  return dayjs(updateInfo.value.time).format("YYYY-MM-DD HH:mm:ss");
});

watch(updateSource, () => {
  updateInfo.value = { needUpdate: false, latestVersion: "", reinstall: false, time: 0, url: "" };
});

async function openLink(url: string) {
  if (isElectron.value) {
    await fetch(`toonflow://openurlwithbrowser?url=${url}`);
  } else {
    window.open(url, "_blank");
  }
}

onMounted(async () => {
  const { data } = await axios.get("/other/getVersion");
  version.value = data;
});

function checkUpdate() {
  updateInfo.value = { needUpdate: false, latestVersion: "", reinstall: false, time: 0, url: "" };
  updateSource.value = "toonflow";
  updateDialogVisible.value = true;
}

function getUpdateSourceLabel(source: UpdateSource) {
  const sourceMap = {
    toonflow: "ToonFlow",
    github: "GitHub",
    atomgit: "AtomGit",
    gitee: "Gitee",
  };

  return sourceMap[source];
}

async function checkUpdateWithSource() {
  updateLoading.value = true;
  try {
    const { data } = await axios.post("/setting/about/checkUpdate", {
      source: updateSource.value,
    });

    updateInfo.value = data;
    if (data.needUpdate) {
      window.$message.success(t("settings.about.updateAvailable"));
    } else {
      MessagePlugin.success(t("settings.about.noUpdate"));
    }
  } catch (e) {
    MessagePlugin.error((e as Error).message ?? t("settings.about.updateFailed"));
  } finally {
    updateLoading.value = false;
  }
}
async function electronAction(action: string) {
  try {
    const res = await fetch(`toonflow://${action}`);
    return await res.json();
  } catch {
    // 非 Electron 环境或请求失败
  }
}

async function doConfirmUpdate() {
  updateLoading.value = true;
  try {
    await axios.post("/setting/about/downloadApp", {
      url: updateInfo.value.url,
      reinstall: updateInfo.value.reinstall,
    });

    electronAction("apprestart");
    MessagePlugin.success(t("settings.about.updateSuccess"));
    updateDialogVisible.value = false;
  } catch (e) {
    MessagePlugin.error((e as Error).message ?? t("settings.about.updateFailed"));
  } finally {
    updateLoading.value = false;
  }
}

function confirmUpdate() {
  const reinstallWarning = updateInfo.value.reinstall ? "\n\n检测到该版本需要重新安装更新，安装过程中可能会替换现有安装，请先保存当前工作。" : "";

  const dialog = DialogPlugin.confirm({
    header: "确认更新",
    body: `将通过 ${getUpdateSourceLabel(updateSource.value)} 更新到 v${updateInfo.value.latestVersion}，确认继续吗？${reinstallWarning}`,
    confirmBtn: {
      content: t("settings.about.confirmUpdate"),
      theme: "primary",
    },
    cancelBtn: t("settings.about.cancel"),
    onConfirm: async () => {
      dialog.destroy();
      await doConfirmUpdate();
    },
    onClose: () => dialog.destroy(),
  });
}
</script>

<style lang="scss" scoped>
.about {
  .logoCard {
    padding: 15px;
    .logo {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      background-color: #ececec;
    }
    .appName {
      width: 90%;
      margin-left: 20px;
      .name {
        font-weight: 900;
        font-size: 20px;
      }
      .data {
        margin-top: 5px;
        font-size: 12px;
        color: #666;
      }
      .version {
        margin-top: 5px;
        font-size: 14px;
        color: #666;
      }
    }
  }
  .logoCard {
    margin-top: 5px;
  }
  span {
    font-size: 12px;
    font-weight: 500;
  }
  .codeRepository {
    margin-top: 15px;
    .github {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: #ececec;
    }
    .gitee {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: #ececec;
    }
  }
  .versionUpdate {
    margin-top: 15px;
    .checkForUpdates {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: #ececec;
    }
  }
  .license {
    margin-top: 15px;
    .data {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background-color: #ececec;
    }
  }
  .updateDialog {
    .updateHeader {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20px;
      .updateIcon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--td-brand-color-light, rgba(0, 82, 217, 0.08));
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }
      .updateTitle {
        font-size: 18px;
        font-weight: 700;
        color: var(--td-text-color-primary);
      }
    }

    .versionCompare {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background: var(--td-bg-color-container-hover, #f5f5f5);
      border-radius: 12px;

      .versionCard {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 1;

        .versionLabel {
          font-size: 12px;
          color: var(--td-text-color-secondary, #999);
          font-weight: 500;
        }
      }

      .arrow {
        display: flex;
        align-items: center;
        padding: 0 4px;
      }
    }

    .versionTime {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin: -8px 0 20px;

      .versionTimeLabel {
        font-size: 12px;
        color: var(--td-text-color-secondary, #999);
      }

      .versionTimeValue {
        font-size: 12px;
        color: var(--td-text-color-primary);
        font-weight: 500;
      }
    }

    .sourceSelect {
      .sourceTitle {
        font-size: 14px;
        font-weight: 600;
        color: var(--td-text-color-primary);
        margin-bottom: 12px;
        display: block;
      }

      .sourceCards {
        display: flex;
        gap: 12px;

        .sourceCard {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 12px;
          border-radius: 10px;
          border: 2px solid var(--td-border-level-2-color, #e7e7e7);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          background: var(--td-bg-color-container);

          &:hover {
            border-color: var(--td-brand-color-hover, #4787f0);
            background: var(--td-brand-color-light, rgba(0, 82, 217, 0.04));
          }

          &.active {
            border-color: var(--td-brand-color);
            background: var(--td-brand-color-light, rgba(0, 82, 217, 0.06));
          }

          &.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--td-bg-color-container-hover, #f5f5f5);

            &:hover {
              border-color: var(--td-border-level-2-color, #e7e7e7);
              background: var(--td-bg-color-container-hover, #f5f5f5);
            }
          }

          .sourceIcon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.github {
              background: #24292e;
              color: #fff;
            }

            &.gitee {
              background: #c71d23;
              color: #fff;
            }
          }

          .sourceName {
            font-size: 14px;
            font-weight: 600;
            color: var(--td-text-color-primary);
          }

          .checkMark {
            position: absolute;
            top: 8px;
            right: 8px;
          }
        }
      }
    }
  }
}
</style>
