// plugins/imageOptimizer.ts
import type { App } from "vue";

interface ImageOptimizerOptions {
  exclude?: string[];
}

const defaultOptions: ImageOptimizerOptions = {
  exclude: [".t-image-viewer__modal-image"],
};

export const imageOptimizer = {
  install(_app: App, userOptions: ImageOptimizerOptions = {}) {
    const options = { ...defaultOptions, ...userOptions };
    const excludeSelector = options.exclude!.join(",");

    // CSS 处理样式，零 JS 开销
    const style = document.createElement("style");
    style.textContent = `img:not(${excludeSelector}) { content-visibility: auto; }`;
    document.head.appendChild(style);

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLImageElement).decoding = "async";
          io.unobserve(entry.target);
        }
      }
    });

    const processImage = (img: HTMLImageElement) => {
      if (img.dataset.opt) return;
      if (img.matches(excludeSelector)) return;
      img.loading = "lazy";
      img.dataset.opt = "1";
      io.observe(img);
    };

    // MutationObserver 只处理新增节点，不全量扫描
    const mo = new MutationObserver((mutations) => {
      // 收集本次批次所有新增 img，用 Set 去重
      const imgs = new Set<HTMLImageElement>();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLImageElement) {
            imgs.add(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll<HTMLImageElement>("img").forEach((img) => imgs.add(img));
          }
        }
      }

      imgs.forEach(processImage);
    });

    // 初始化：仅首次全量扫描一次
    const init = () => {
      document.querySelectorAll<HTMLImageElement>("img").forEach(processImage);
      mo.observe(document.body, { childList: true, subtree: true });
    };

    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init, { once: true }) : init();
  },
};
