import axios from "@/utils/axios";
import { NotifyPlugin, Progress } from "tdesign-vue-next";
import { h, ref } from "vue";
import { storeToRefs } from "pinia";
import settingStore from "@/stores/setting";

// 延迟函数
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async () => {
  const { showSetting, activeMenu } = storeToRefs(settingStore());

  const progressValue = ref(0);
  // 显示进度通知
  const notifyInstance = NotifyPlugin.info({
    title: $t("skillScan.scanning"),
    content: () =>
      h("div", { style: "width: 100%; padding-top: 10px;" }, [
        h(Progress, {
          percentage: progressValue.value,
          status: progressValue.value >= 100 ? "success" : "active",
        }),
      ]),
    duration: 0,
    closeBtn: true,
  });
  try {
    const [{ data }] = await Promise.all([
      axios.post("/setting/skillManagement/scanSkills"),
      (async () => {
        for (let i = 1; i <= 10; i++) {
          await delay(100);
          progressValue.value = i * 9;
        }
      })(),
    ]);
    progressValue.value = 100;
    await delay(300);
    NotifyPlugin.close(notifyInstance);
    // 成功通知
    const changes = [
      data.insertedCount && $t("skillScan.inserted", { count: data.insertedCount }),
      data.updatedCount && $t("skillScan.updated", { count: data.updatedCount }),
      data.removedCount && $t("skillScan.removed", { count: data.removedCount }),
    ].filter(Boolean);
    NotifyPlugin.success({
      title: $t("skillScan.scanComplete"),
      content: `${$t("skillScan.scannedFiles", { count: data.totalFiles })} | ${changes.join(" | ")}`,
      closeBtn: true,
    });
    // 警告通知
    if (data.noDescriptionSkillCount > 0 || data.noAttributionSkillCount > 0) {
      const warnings = [];
      if (data.noDescriptionSkillCount > 0) {
        warnings.push($t("skillScan.noDescription", { count: data.noDescriptionSkillCount }));
      }
      if (data.noAttributionSkillCount > 0) {
        warnings.push($t("skillScan.noAttribution", { count: data.noAttributionSkillCount }));
      }
      const warningNotifyInstance = NotifyPlugin.warning({
        title: $t("skillScan.configWarning"),
        content: warnings.join(" | "),
        footer: () =>
          h(
            "div",
            { style: "text-align: right; padding-top: 4px;" },
            h(
              "span",
              {
                style: "color: #ed7b2f; font-size: 12px; cursor: pointer;",
                onClick: () => {
                  activeMenu.value = "skillManagement";
                  showSetting.value = true;
                  NotifyPlugin.close(warningNotifyInstance);
                },
              },
              $t("skillScan.openSettings"),
            ),
          ),
        duration: 6000,
        closeBtn: true,
      });
    }
  } catch (error) {
    NotifyPlugin.close(notifyInstance);
    NotifyPlugin.error({
      title: $t("skillScan.scanFailed"),
      content: $t("skillScan.checkNetwork"),
      footer: () =>
        h("div", { style: "text-align: right; padding-top: 4px;" }, h("span", { style: "color: #e34d59; font-size: 12px;" }, $t("skillScan.retryLater"))),
      duration: 3000,
      closeBtn: true,
    });
  }
};
