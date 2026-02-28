import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver, ElementPlusResolver, TDesignResolver } from "unplugin-vue-components/resolvers";
import { lazyImport, VxeResolver } from "vite-plugin-lazy-import";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [
    vue(),
    AutoImport({
      dts: "src/types/auto-imports.d.ts",
      imports: ["vue", "pinia", "vue-router"],
      resolvers: [
        ElementPlusResolver(),
        TDesignResolver({
          library: "vue-next",
        }),
      ],
    }),
    Components({
      dts: "src/types/components.d.ts",
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
        ElementPlusResolver(),
        TDesignResolver({
          library: "vue-next",
        }),
      ],
    }),
    lazyImport({
      resolvers: [
        VxeResolver({
          libraryName: "vxe-table",
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
});
