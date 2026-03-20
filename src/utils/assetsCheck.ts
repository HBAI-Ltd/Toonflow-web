import { h, ref, render, nextTick } from "vue";
import { Dialog as TDialog } from "tdesign-vue-next";
import AssetsView from "@/views/assets/index.vue";

interface Asset {
  id: number;
  name: string;
  prompt: string;
  describe: string;
  remark: string;
  filePath?: string;
  type: string;
  sonAssets?: Asset[];
}

export type AssetType = "role" | "tool" | "scene" | "clip";

export interface AssetsSelectOptions {
  /** 限制显示的资产类型，不传则显示全部 */
  types?: AssetType[];
  /** 是否多选，默认 true */
  multiple?: boolean;
  /** 弹窗标题 */
  title?: string;
}

export default function openAssetsSelector(options: AssetsSelectOptions = {}): Promise<Asset[]> {
  console.log("%c Line:28 🍕 options", "background:#b03734", options);
  const { types, multiple = true, title = "选择资产" } = options;
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
          confirmBtn: "确认选择",
          cancelBtn: "取消",
          onConfirm: () => {
            const selectedKeys = assetsRef.value?.selectedRowKeys || [];
            const data = assetsRef.value?.tableData || [];
            const selected = data.filter((item) => selectedKeys.includes(item.id));
            finish(selected);
          },
          onClose: () => finish([]),
          onCancel: () => finish([]),
          onClosed: () => cleanup(),
        },
        {
          default: () =>
            h(AssetsView, {
              ref: assetsRef,
              selectorMode: true,
              allowedTypes: types,
              multiple,
            }),
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
