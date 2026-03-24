import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { TDesignResolver } from "@tdesign-vue-next/auto-import-resolver";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  build: {
    assetsInlineLimit: Infinity,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    vue(),
    AutoImport({
      dts: "src/types/auto-imports.d.ts",
      imports: ["vue", "pinia", "vue-router"],
      resolvers: [
        TDesignResolver({
          library: "vue-next",
        }),
        TDesignResolver({
          library: "chat",
        }),
      ],
    }),
    Components({
      dts: "src/types/components.d.ts",
      resolvers: [
        TDesignResolver({
          library: "vue-next",
        }),
        TDesignResolver({
          library: "chat",
        }),
      ],
    }),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  server:{
    port: 50188,
  }
});
