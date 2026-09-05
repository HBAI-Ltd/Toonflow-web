import axios from "@/utils/axios";

export interface BgTask {
  id: number;
  kind: string; // 任务类型：faceUpload（人脸上传）；后续生图/测试等长任务可复用
  title: string;
  previewUrl?: string;
  payload?: any; // 执行参数（如图片测试的请求体）
  resultUrl?: string; // 成功产物（如生成的测试图 URL，托盘可直接查看）
  runningText?: string; // 自定义进行中文案
  successText?: string; // 自定义成功文案
  status: "pending" | "running" | "success" | "fail" | "paused"; // paused：用户暂停，可一键恢复
  error?: string; // 失败原因（axios 拦截器 reject 的是 response.data，e.message 即后端 message）
  createTime: number;
}

// 任务执行器注册表：把「怎么执行」与「任务中心」解耦，任何长任务都能挂进来全局后台运行
const runners = new Map<string, (task: BgTask, signal: AbortSignal) => Promise<any>>();
// 每个运行中任务的取消器：全部停止时真正中断在途 HTTP 请求
const controllers = new Map<number, AbortController>();

// 人脸资产上传：全部交给视觉模型自动识别，串行执行避免并发打爆 Vision 接口
runners.set("faceUpload", async (task, signal) => {
  await axios.post("/faceAsset/addFaceAsset", { fileUrl: task.previewUrl, species: 1 }, { signal });
});

// 图像模型测试：生成测试图，完成后结果 URL 直接挂到任务上供托盘查看
runners.set("imageModelTest", async (task, signal) => {
  const { data } = await axios.post("/setting/vendorConfig/modelTest/imageTest", task.payload, { signal });
  task.resultUrl = typeof data === "string" ? data : data?.url || "";
});

/**
 * 全局后台任务中心
 * - 任务状态挂在 Pinia store，与页面生命周期解耦：切走路由任务照常运行
 * - 右下角全局托盘展示进度，失败项带原因与重试
 */
export default defineStore(
  "backgroundTask",
  () => {
    const tasks = ref<BgTask[]>([]);
    const panelCollapsed = ref(false);
    let seq = 0;
    let processing = false;

    const counts = computed(() => {
      const c = { pending: 0, running: 0, success: 0, fail: 0, paused: 0, done: 0 };
      for (const t of tasks.value) c[t.status]++;
      c.done = c.success + c.fail + c.paused;
      return c;
    });
    const active = computed(() => counts.value.pending + counts.value.running > 0);

    // 供人脸资产页 watch：每录入成功一张就 +1，页面在场时刷新列表与覆盖统计
    const faceUploadSuccessVersion = ref(0);

    function registerRunner(kind: string, fn: (task: BgTask) => Promise<any>) {
      runners.set(kind, fn);
    }

    function pushTask(task: Omit<BgTask, "id" | "status" | "createTime">) {
      const t: BgTask = { ...task, id: ++seq, status: "pending", createTime: Date.now() };
      tasks.value.push(t);
      processQueue();
      return t;
    }

    function addFaceUploadFiles(files: File[]) {
      panelCollapsed.value = false;
      for (const f of files) {
        const reader = new FileReader();
        reader.onload = () => {
          pushTask({ kind: "faceUpload", title: f.name, previewUrl: reader.result as string });
        };
        reader.readAsDataURL(f);
      }
    }

    function addImageModelTest(payload: Record<string, any>, title: string) {
      panelCollapsed.value = false;
      return pushTask({ kind: "imageModelTest", title, payload, runningText: "测试图生成中…", successText: "✅ 测试图已生成，点击缩略图查看" });
    }

    async function processQueue() {
      if (processing) return;
      processing = true;
      try {
        while (true) {
          const task = tasks.value.find((t) => t.status === "pending");
          if (!task) break;
          task.status = "running";
          task.error = undefined;
          const runner = runners.get(task.kind);
          if (!runner) {
            task.status = "fail";
            task.error = `未注册的任务类型: ${task.kind}`;
            continue;
          }
          const ac = new AbortController();
          controllers.set(task.id, ac);
          try {
            await runner(task, ac.signal);
            if (ac.signal.aborted) {
              task.status = "paused";
            } else {
              task.status = "success";
              if (task.kind === "faceUpload") faceUploadSuccessVersion.value++;
            }
          } catch (e: any) {
            if (ac.signal.aborted) {
              task.status = "paused"; // 用户主动暂停，不算失败
            } else {
              task.status = "fail";
              task.error = e?.message || "未知错误";
            }
          } finally {
            controllers.delete(task.id);
          }
        }
      } finally {
        processing = false;
      }
    }

    function retryTask(task: BgTask) {
      if (task.status !== "fail" && task.status !== "paused") return;
      task.status = "pending";
      task.error = undefined;
      processQueue();
    }

    function retryAllFailed() {
      for (const t of tasks.value) {
        if (t.status === "fail") {
          t.status = "pending";
          t.error = undefined;
        }
      }
      processQueue();
    }

    function clearTasks() {
      if (active.value) return;
      tasks.value = [];
    }

    /** 一键全部暂停：排队中的直接挂起，运行中的中断其在途请求（可随时恢复） */
    function pauseAll() {
      for (const t of tasks.value) {
        if (t.status === "pending") t.status = "paused";
        else if (t.status === "running") controllers.get(t.id)?.abort(); // 中断后由 processQueue 标记为 paused
      }
    }

    /** 一键恢复：挂起的任务重新排队执行 */
    function resumeAll() {
      for (const t of tasks.value) {
        if (t.status === "paused") {
          t.status = "pending";
          t.error = undefined;
        }
      }
      processQueue();
    }

    function collapse(v?: boolean) {
      panelCollapsed.value = v ?? !panelCollapsed.value;
    }

    return {
      tasks,
      panelCollapsed,
      counts,
      active,
      faceUploadSuccessVersion,
      registerRunner,
      addFaceUploadFiles,
      addImageModelTest,
      retryTask,
      retryAllFailed,
      clearTasks,
      pauseAll,
      resumeAll,
      collapse,
    };
  },
  { persist: false },
);
