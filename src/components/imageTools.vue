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
      <t-image-viewer v-model:visible="previewVisible" :images="[bigSrc]">
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
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src: string;
    placement?: string;
    position?: "none" | "br" | "bl" | "tr" | "tl";
    margin?: string;
    size?: number;
  }>(),
  {
    placement: "bottom",
    position: "none",
    margin: "4px",
    size: 100,
  },
);

const placement = computed<any>(() => props.placement);

const bigSrc = computed(() => {
  return `${props.src.split("?") ?   props.src.split("?")[0] : props.src}`;
});

const positionStyle = computed<any>(() => {
  const map: Record<string, any> = {
    br: { position: "absolute", bottom: props.margin, right: props.margin },
    bl: { position: "absolute", bottom: props.margin, left: props.margin },
    tr: { position: "absolute", top: props.margin, right: props.margin },
    tl: { position: "absolute", top: props.margin, left: props.margin },
    none: { margin: props.margin },
  };
  return map[props.position];
});

const previewVisible = ref(false);

function handlePreview() {
  previewVisible.value = true;
}

function triggerAnchorClick(href: string, filename: string, newTab = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  const url = bigSrc.value;
  const filename = url.split("/").pop()?.split("?")[0] || "image";
  let objectUrl = "";
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error($t("components.imageTools.msg.downloadFailed"));
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    triggerAnchorClick(objectUrl, filename);
    window.$message.success($t("components.imageTools.msg.downloadStarted"));
  } catch {
    triggerAnchorClick(url, filename, true);
    window.$message.warning($t("components.imageTools.msg.downloadBlockedOpenNewWindow"));
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
</script>

<style lang="scss" scoped>
.imageTools {
  gap: 4px;
  display: flex;
}
</style>
