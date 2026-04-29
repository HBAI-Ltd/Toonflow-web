<template>
  <div class="imageTools" :style="positionStyle">
    <t-tooltip theme="primary" :content="$t('components.imageTools.copy')" :placement="placement">
      <t-button variant="outline" size="small" shape="square" @click.stop="handleCopy">
        <template #icon>
          <i-copy size="16" />
        </template>
      </t-button>
    </t-tooltip>
    <t-tooltip theme="primary" :content="$t('components.imageTools.preview')" :placement="placement">
      <t-image-viewer v-model:visible="previewVisible" :images="[previewSrc]">
        <template #trigger>
          <t-button variant="outline" size="small" shape="square" @click.stop="handlePreview">
            <template #icon>
              <i-expand-text-input size="16" />
            </template>
          </t-button>
        </template>
      </t-image-viewer>
    </t-tooltip>
    <t-tooltip theme="primary" :content="$t('components.imageTools.download')" :placement="placement">
      <t-button variant="outline" size="small" shape="square" @click.stop="handleDownload">
        <template #icon>
          <i-download size="16" />
        </template>
      </t-button>
    </t-tooltip>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";

const props = defineProps<{
  src: string;
  placement?: string;
  position?: "none" | "br" | "bl" | "tr" | "tl";
  margin?: string;
}>();

const placement = computed<any>(function () {
  return props.placement || "bottom";
});

const positionStyle = computed<any>(function () {
  const margin = props.margin ?? "4px";
  const position = props.position || "none";
  const map: Record<string, any> = {
    br: { position: "absolute", bottom: margin, right: margin },
    bl: { position: "absolute", bottom: margin, left: margin },
    tr: { position: "absolute", top: margin, right: margin },
    tl: { position: "absolute", top: margin, left: margin },
    none: { margin: margin },
  };
  return map[position];
});

const previewVisible = ref(false);
const previewSrc = ref("");

async function handlePreview() {
  const { data } = await axios.post("/common/getBigImage", {
    url: props.src,
  });
  previewSrc.value = data;
  previewVisible.value = true;
}

async function handleCopy() {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = props.src;
    await new Promise<void>(function (resolve, reject) {
      img.onload = function () {
        resolve();
      };
      img.onerror = function () {
        reject(new Error($t("components.imageTools.msg.imageLoadFailed")));
      };
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob>(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) {
          resolve(b);
          return;
        }
        reject(new Error($t("components.imageTools.msg.convertFailed")));
      }, "image/png");
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    window.$message.success($t("components.imageTools.msg.copied"));
  } catch {
    window.$message.error($t("components.imageTools.msg.copyFailed"));
  }
}

async function handleDownload() {
  const { data } = await axios.post("/common/getBigImage", {
    url: props.src,
  });
  let objectUrl = "";
  try {
    const response = await fetch(data, { mode: "cors" });
    if (!response.ok) {
      throw new Error($t("components.imageTools.msg.downloadFailed"));
    }
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = data.split("/").pop() || "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.$message.success($t("components.imageTools.msg.downloadStarted"));
  } catch {
    const a = document.createElement("a");
    a.href = data;
    a.download = data.split("/").pop() || "image";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.$message.warning($t("components.imageTools.msg.downloadBlockedOpenNewWindow"));
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
</script>

<style lang="scss" scoped>
.imageTools {
  gap: 4px;
  display: flex;
}
</style>
