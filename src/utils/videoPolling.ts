import axios from "@/utils/axios";

/** 轮询返回的单条视频记录 */
export interface PollingVideoRecord {
  id: number | string;
  storyboardId: number | string;
  filePath: string;
  state: string;
  errorReason?: string;
}

/** 轮询配置选项 */
export interface VideoPollingOptions {
  /** 轮询间隔（毫秒），默认 5000 */
  interval?: number;
  /** 最大连续失败次数，超过后自动停止，默认 10 */
  maxErrors?: number;
  /** 错误退避最大延迟（毫秒），默认 30000 */
  maxBackoffDelay?: number;
  /** 每次轮询结果回调 */
  onData?: (records: PollingVideoRecord[]) => void;
  /** 全部完成回调（pendingIds 清空时触发） */
  onComplete?: () => void;
  /** 轮询出错回调 */
  onError?: (error: any, errorCount: number) => void;
  /** 连续失败次数过多，自动停止时的回调 */
  onMaxErrors?: () => void;
}

/**
 * 创建一个视频轮询实例，用于定期查询生成中的视频状态。
 *
 * @param scriptId  脚本 ID
 * @param options   轮询配置
 *
 * @example
 * ```ts
 * const poller = createVideoPolling(scriptId, {
 *   onData(records) {
 *     // 处理轮询返回的视频记录，更新列表状态
 *   },
 *   onComplete() {
 *     // 所有视频已完成
 *   },
 * });
 *
 * // 添加待轮询的视频 ID
 * poller.addIds([101, 102]);
 *
 * // 启动轮询
 * poller.start();
 *
 * // 组件卸载时销毁
 * poller.destroy();
 * ```
 */
export function createVideoPolling(scriptId: number | string, options: VideoPollingOptions = {}) {
  const {
    interval = 5000,
    maxErrors = 10,
    maxBackoffDelay = 30000,
    onData,
    onComplete,
    onError,
    onMaxErrors,
  } = options;

  /** 待轮询的视频 ID 列表 */
  let pendingIds: Array<number | string> = [];
  /** 定时器句柄 */
  let timer: number | null = null;
  /** 是否正在执行轮询请求（防止并发重叠） */
  let inFlight = false;
  /** 连续失败计数 */
  let errorCount = 0;
  /** 用于取消进行中的请求 */
  let abortController: AbortController | null = null;
  /** 是否已销毁 */
  let destroyed = false;

  /** 执行一次轮询请求 */
  async function poll() {
    if (destroyed || pendingIds.length === 0 || inFlight) return;

    inFlight = true;
    try {
      abortController = new AbortController();
      const { data } = await axios.post(
        "/production/workbench/videoPolling",
        { scriptId, specifyIds: [...pendingIds] },
        { signal: abortController.signal },
      );

      if (destroyed) return;
      errorCount = 0;

      if (!data || data.length === 0) {
        // 后端无记录，清空待轮询列表
        pendingIds = [];
        onComplete?.();
        stop();
        return;
      }

      const records = data as PollingVideoRecord[];
      onData?.(records);

      // 移除已完成（成功或失败）的 ID
      const doneIds = records
        .filter((r) => r.state === "生成成功" || r.state === "生成失败")
        .map((r) => r.id);
      if (doneIds.length > 0) {
        pendingIds = pendingIds.filter((id) => !doneIds.includes(id));
      }
      // 后端未返回的 ID 视为已失效，一并移除
      const returnedIds = records.map((r) => r.id);
      pendingIds = pendingIds.filter((id) => returnedIds.includes(id));

      if (pendingIds.length === 0) {
        onComplete?.();
        stop();
      }
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") return;
      errorCount++;
      onError?.(error, errorCount);
      if (errorCount >= maxErrors) {
        onMaxErrors?.();
        stop();
        return;
      }
    } finally {
      abortController = null;
      inFlight = false;
    }
  }

  /** 安排下一次轮询 */
  function scheduleNext(delay: number) {
    if (destroyed || pendingIds.length === 0) return;
    timer = window.setTimeout(async () => {
      timer = null;
      await poll();
      // 轮询完成后若仍有待查询 ID，继续安排下一次
      if (pendingIds.length > 0 && !destroyed) {
        const nextDelay = errorCount > 0
          ? Math.min(interval * Math.pow(2, errorCount - 1), maxBackoffDelay)
          : interval;
        scheduleNext(nextDelay);
      }
    }, delay);
  }

  /** 启动轮询。force=true 时会重置错误计数并重新开始 */
  function start(force = false) {
    if (destroyed) return;
    if (timer) {
      if (!force) return;
      stop();
    }
    if (pendingIds.length === 0) return;
    errorCount = 0;
    // 立即执行第一次
    scheduleNext(0);
  }

  /** 停止轮询 */
  function stop() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    inFlight = false;
  }

  /** 添加待轮询的视频 ID（自动去重） */
  function addIds(ids: Array<number | string>) {
    const set = new Set([...pendingIds, ...ids]);
    pendingIds = [...set];
  }

  /** 获取当前待轮询的 ID 列表 */
  function getPendingIds(): Array<number | string> {
    return [...pendingIds];
  }

  /** 是否正在轮询中 */
  function isPolling(): boolean {
    return timer !== null || inFlight;
  }

  /** 销毁实例，停止轮询并清理所有状态 */
  function destroy() {
    destroyed = true;
    stop();
    pendingIds = [];
  }

  return {
    start,
    stop,
    addIds,
    getPendingIds,
    isPolling,
    destroy,
  };
}
