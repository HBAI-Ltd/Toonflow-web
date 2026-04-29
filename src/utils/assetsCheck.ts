import { h, ref, render, nextTick } from "vue";
import { Dialog as TDialog } from "tdesign-vue-next";
import AssetsView from "@/views/assets/index.vue";

interface Asset {
  id: number;
  assetsId: number | null;
  name: string;
  prompt: string;
  describe: string;
  remark: string;
  src: string;
  type: "role" | "tool" | "scene" | "clip" | "audio";
  imageId: number | null;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
  sonAssets?: Asset[];
}

export type AssetType = "role" | "tool" | "scene" | "clip" | "audio";
export type ClipMediaType = "image" | "video" | "audio";

export interface AssetsSelectOptions {
  /** 限制显示的资产类型，不传则显示全部 */
  types?: AssetType[];
  /** 当 types 包含 clip 时，限制 clip 的媒体子类型（图片/视频/音频），不传则显示全部 */
  clipMediaTypes?: ClipMediaType[];
  /** 是否多选，默认 true */
  multiple?: boolean;
  /** 弹窗标题 */
  title?: string;
  selectorMode?: boolean;
}

export default function openAssetsSelector(options: AssetsSelectOptions = {}): Promise<Asset[]> {
  const { types, clipMediaTypes, multiple = true, title = window.$t("common.selectAssets"), selectorMode = false } = options;
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const visible = ref(false);
    const assetsRef = ref<InstanceType<typeof AssetsView>>();
    let done = false;

    const cleanup = () => {
      render(null, container);
      container.remove();
    };

    const finish = (assets: Asset[]) => {
      if (done) return;
      done = true;
      visible.value = false;
      renderDialog();
      resolve(assets);
    };

    const renderDialog = () => {
      const vnode = h(
        TDialog,
        {
          visible: visible.value,
          header: title,
          width: "80%",
          top: "5vh",
          destroyOnClose: true,
          confirmBtn: window.$t("common.confirm"),
          cancelBtn: window.$t("common.cancel"),
          onConfirm: () => {
            const selectedKeys = assetsRef.value?.selectedRowKeys || [];
            const selectedSubKeys = assetsRef.value?.selectedSubRowKeys || [];
            const data = assetsRef.value?.tableData || [];
            // 选中的父资产
            const selectedParents = data.filter((item) => selectedKeys.includes(item.id));
            // 选中的子资产
            const selectedSubs: Asset[] = [];
            data.forEach((item) => {
              item.sonAssets?.forEach((sub: any) => {
                if (selectedSubKeys.includes(sub.id)) selectedSubs.push(sub);
              });
            });
            finish([...selectedParents, ...selectedSubs] as any[]);
          },
          onClose: () => finish([]),
          onCancel: () => finish([]),
          onClosed: () => cleanup(),
        },
        {
          default: () =>
            h("div", { style: "height: 72vh; overflow: auto;" }, [
              h(AssetsView, {
                ref: assetsRef,
                selectorMode: selectorMode,
                allowedTypes: types,
                clipMediaTypes,
                multiple,
              }),
            ]),
        },
      );
      // 继承主应用上下文，使全局注册的组件可用
      const appContext = (document.querySelector("#app") as any)?.__vue_app__?._context;
      if (appContext) {
        vnode.appContext = appContext;
      }
      render(vnode, container);
    };

    renderDialog();
    nextTick(() => {
      visible.value = true;
      renderDialog();
    });
  });
}
