export default defineStore(
  "setting",
  () => {
    const baseUrl = ref<string>("http://localhost:60000");
    const wsBaseUrl = ref<string>("ws://localhost:60000");

    const otherSetting = ref({
      axiosTimeOut: 60000 * 10 * 100,
      assetsBatchGenereateSize: 5,
    });

    const themeSetting = ref({
      mode: "light" as "light" | "dark" | "auto",
      primaryColor: "#9810fa",
    });

    return { baseUrl, wsBaseUrl, otherSetting, themeSetting };
  },
  { persist: true },
);
