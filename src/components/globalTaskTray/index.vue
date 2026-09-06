<template>
  <transition name="tray-slide">
    <div v-if="taskStore.tasks.length" class="globalTaskTray">
      <div class="trayHeader" @click="taskStore.collapse()">
        <span class="trayTitle">
          <template v-if="taskStore.active">⏳ 后台任务 {{ taskStore.counts.done }}/{{ taskStore.tasks.length }}</template>
          <template v-else-if="taskStore.counts.fail > 0">⚠️ 已完成 · {{ taskStore.counts.fail }} 项失败</template>
          <template v-else-if="taskStore.counts.paused > 0">⏸ 已暂停 · {{ taskStore.counts.paused }} 项（点「全部开始」恢复）</template>
          <template v-else>✅ 后台任务完成 · 共 {{ taskStore.tasks.length }} 项</template>
        </span>
        <span class="trayOps">
          <t-button v-if="taskStore.active" size="small" variant="text" theme="danger" @click.stop="taskStore.pauseAll()">全部暂停</t-button>
          <t-button v-else-if="taskStore.counts.paused > 0" size="small" variant="text" theme="primary" @click.stop="taskStore.resumeAll()">全部开始</t-button>
          <t-button v-if="!taskStore.active" size="small" variant="text" theme="default" @click.stop="taskStore.clearTasks()">关闭</t-button>
          <span class="trayToggle">{{ taskStore.panelCollapsed ? "展开" : "收起" }}</span>
        </span>
      </div>

      <div v-if="!taskStore.panelCollapsed" class="trayBody">
        <div v-if="taskStore.counts.fail > 0 && !taskStore.active" class="trayRetryAll">
          <t-button size="small" variant="outline" theme="warning" @click="taskStore.retryAllFailed()">重试全部失败项（{{ taskStore.counts.fail }}）</t-button>
        </div>
        <div class="trayList">
          <div v-for="t in taskStore.tasks" :key="t.id" class="trayItem" :class="`is-${t.status}`">
            <img v-if="t.previewUrl" :src="t.previewUrl" class="trayThumb" :alt="t.title" />
            <img v-else-if="t.status === 'success' && t.resultUrl" :src="t.resultUrl" class="trayThumb trayThumb--result" :alt="t.title" @click="openResult(t)" />
            <div v-else class="trayThumb trayThumb--ph">图</div>
            <div class="trayMeta">
              <div class="trayName" :title="t.title">{{ t.title }}</div>
              <div class="trayStatus">
                <template v-if="t.status === 'pending'">排队中…</template>
                <template v-else-if="t.status === 'running'"><span class="traySpinner"></span>{{ t.runningText || "处理中…" }}</template>
                <template v-else-if="t.status === 'success'">{{ t.successText || "✅ 已完成" }}</template>
                <template v-else-if="t.status === 'paused'">⏸ 已暂停</template>
                <template v-else>❌ 上传失败</template>
              </div>
              <div v-if="t.status === 'fail' && t.error" class="trayError" :title="t.error">原因：{{ t.error }}</div>
            </div>
            <t-button v-if="t.status === 'fail'" size="small" variant="text" theme="primary" @click="taskStore.retryTask(t)">重试</t-button>
            <t-button v-else-if="t.status === 'paused'" size="small" variant="text" theme="primary" @click="taskStore.retryTask(t)">开始</t-button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import backgroundTaskStore from "@/stores/backgroundTask";
import type { BgTask } from "@/stores/backgroundTask";

const taskStore = backgroundTaskStore();

function openResult(t: BgTask) {
  if (t.resultUrl) window.open(t.resultUrl, "_blank", "noopener,noreferrer");
}
</script>

<style lang="scss" scoped>
.globalTaskTray {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 3000;
  width: 340px;
  max-width: calc(100vw - 40px);
  background: var(--td-bg-color-container, #fff);
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: var(--td-radius-large, 8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.trayHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  background: var(--td-bg-color-container-hover, #f5f5f5);
  border-bottom: 1px solid var(--td-component-border, #eee);

  .trayTitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--td-text-color-primary, #333);
  }

  .trayOps {
    display: flex;
    align-items: center;
    gap: 6px;

    .trayToggle {
      font-size: 12px;
      color: var(--td-text-color-secondary, #999);
    }
  }
}

.trayBody {
  .trayRetryAll {
    padding: 8px 12px 0;
  }
}

.trayList {
  max-height: 280px;
  overflow-y: auto;
  padding: 8px 12px;
}

.trayItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--td-component-border, #eee);

  &:last-child {
    border-bottom: none;
    padding-bottom: 4px;
  }
}

.trayThumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--td-bg-color-secondarycontainer, #f0f0f0);

  &--ph {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--td-text-color-secondary, #999);
  }

  &--result {
    cursor: zoom-in;
  }
}

.trayMeta {
  flex: 1;
  min-width: 0;

  .trayName {
    font-size: 13px;
    color: var(--td-text-color-primary, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .trayStatus {
    margin-top: 2px;
    font-size: 12px;
    color: var(--td-text-color-secondary, #999);
    display: flex;
    align-items: center;
    gap: 6px;

    .traySpinner {
      width: 12px;
      height: 12px;
      border: 2px solid var(--td-brand-color-light, #d9e5ff);
      border-top-color: var(--td-brand-color, #0052d9);
      border-radius: 50%;
      animation: traySpin 0.8s linear infinite;
    }
  }

  .trayError {
    margin-top: 2px;
    font-size: 12px;
    color: var(--td-error-color, #d54941);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.trayItem.is-success .trayStatus {
  color: var(--td-success-color, #2ba471);
}

.trayItem.is-fail .trayStatus {
  color: var(--td-error-color, #d54941);
}

.trayItem.is-paused .trayStatus {
  color: var(--td-text-color-secondary, #999);
}

@keyframes traySpin {
  to {
    transform: rotate(360deg);
  }
}

.tray-slide-enter-active,
.tray-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.tray-slide-enter-from,
.tray-slide-leave-to {
  transform: translateY(16px);
  opacity: 0;
}
</style>
