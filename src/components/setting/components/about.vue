<template>
  <div class="about">
    <t-card bordered :style="{ width: '100%' }" class="logoCard">
      <div class="f">
        <img src="@/assets/logo.png" alt="ToonFlow Logo" class="logo" />
        <div class="appName">
          <div class="name">ToonFlow</div>
          <div class="data">开源的AI驱动漫画 / 分镜创作工具</div>
          <div class="version">
            <t-tag theme="primary" shape="round" size="small" style="padding: 10px">{{ version }} · 当前为最新版本</t-tag>
          </div>
        </div>
        <div class="renew ac">
          <t-button theme="primary" @click="$emit('renew')">
            <template #icon>
              <i-refresh theme="outline" size="18" />
            </template>
            <span style="margin-left: 5px">检查更新</span>
          </t-button>
        </div>
      </div>
    </t-card>
    <div class="codeRepository">
      <span>代码仓库</span>
      <t-card bordered :style="{ width: '100%' }" class="logoCard">
        <div class="ac jb" style="cursor: pointer" @click="openLink('https://github.com/HBAI-Ltd/Toonflow-app')">
          <div class="f">
            <div class="github">
              <i-github theme="outline" size="22" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">GitHub 仓库</span>
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
                <span style="font-size: 15px; font-weight: 900">Gitee 仓库</span>
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
    <div class="versionUpdate">
      <span>版本更新</span>
      <t-card bordered :style="{ width: '100%' }" class="logoCard">
        <div class="ac jb" style="cursor: pointer" @click="openLink('https://github.com/HBAI-Ltd/Toonflow-app/releases')">
          <div class="f">
            <div class="checkForUpdates">
              <i-refresh theme="outline" size="20" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">检查更新(GitHub)</span>
              </div>
              <div>
                <span style="font-size: 12px; color: #666">从GiHub Release 获取最新版本</span>
              </div>
            </div>
          </div>
          <i-right theme="outline" size="18" />
        </div>
        <t-divider></t-divider>
        <div class="ac jb" style="cursor: pointer" @click="openLink('https://gitee.com/HBAI-Ltd/Toonflow-app/releases')">
          <div class="f">
            <div class="checkForUpdates">
              <i-refresh theme="outline" size="20" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">检查更新(Gitee)</span>
              </div>
              <div>
                <span style="font-size: 12px; color: #666">从Gitee Release获取最新版本</span>
              </div>
            </div>
          </div>
          <i-right theme="outline" size="18" />
        </div>
      </t-card>
    </div>
    <div class="license">
      <span>许可证</span>
      <t-card bordered :style="{ width: '100%' }" class="logoCard">
        <div class="ac jb" style="cursor: pointer" @click="licenseFn">
          <div class="f">
            <div class="data">
              <i-notes theme="outline" size="20" class="c" style="width: 100%; height: 100%" />
            </div>
            <div style="margin-left: 15px">
              <div>
                <span style="font-size: 15px; font-weight: 900">AGPL-3.0 License</span>
              </div>
              <div>
                <span style="font-size: 12px; color: #666">开源许可协议·点击查看详情</span>
              </div>
            </div>
          </div>
          <i-right theme="outline" size="18" />
        </div>
      </t-card>
    </div>
  </div>
</template>

<script setup lang="ts">
//版本号
import store from "@/stores/index";
const { version } = storeToRefs(store());
function openLink(url: string) {
  window.open(url, "_blank");
}
//许可证详情
function licenseFn() {}
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
}
</style>
