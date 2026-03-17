<template>
  <div class="imageTools" :style="positionStyle">
    <t-tooltip theme="primary" content="复制图片" :placement>
      <t-button variant="outline" size="small" shape="square" @click.stop="handleCopy">
        <template #icon>
          <i-copy size="16" />
        </template>
      </t-button>
    </t-tooltip>
    <t-tooltip theme="primary" content="预览" :placement>
      <t-image-viewer v-model:visible="previewVisible" :images="[props.src]">
        <template #trigger>
          <t-button variant="outline" size="small" shape="square" @click.stop="handlePreview">
            <template #icon>
              <i-expand-text-input size="16" />
            </template>
          </t-button>
        </template>
      </t-image-viewer>
    </t-tooltip>
    <t-tooltip theme="primary" content="下载" :placement>
      <t-button variant="outline" size="small" shape="square" @click.stop="handleDownload">
        <template #icon>
          <i-download size="16" />
        </template>
      </t-button>
    </t-tooltip>
  </div>
</template>

<script setup lang="ts">
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

function handlePreview() {
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
        reject(new Error("图片加载失败"));
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
        reject(new Error("转换失败"));
      }, "image/png");
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    window.$message.success("已复制到剪贴板");
  } catch {
    window.$message.error("复制失败");
  }
}

async function handleDownload() {
  let objectUrl = "";
  try {
    const response = await fetch(props.src, { mode: "cors" });
    if (!response.ok) {
      throw new Error("下载失败");
    }
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = props.src.split("/").pop() || "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.$message.success("开始下载");
  } catch {
    const a = document.createElement("a");
    a.href = props.src;
    a.download = props.src.split("/").pop() || "image";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.$message.warning("当前图片源可能限制下载，已尝试在新窗口打开");
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
