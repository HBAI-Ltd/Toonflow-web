// config/manufacturerConfig.ts
import type { ManufacturerConfig, ManufacturerType } from "@/types/manufacturer";

export const MANUFACTURER_CONFIGS: Record<ManufacturerType, ManufacturerConfig> = {
  volcengine: {
    value: "volcengine",
    label: "火山引擎",
    maxImages: 2,
    minImages: 1,
    durationOptions: [
      { value: 4, label: "4秒" },
      { value: 5, label: "5秒" },
      { value: 6, label: "6秒" },
      { value: 7, label: "7秒" },
      { value: 8, label: "8秒" },
      { value: 9, label: "9秒" },
      { value: 10, label: "10秒" },
      { value: 11, label: "11秒" },
      { value: 12, label: "12秒" },
    ],
    resolutionOptions: [
      { value: "480p", label: "480p" },
      { value: "720p", label: "720p" },
      { value: "1080p", label: "1080p" },
    ],
    ratioOptions: [
      { value: "16:9", label: "16:9" },
      { value: "4:3", label: "4:3" },
      { value: "1:1", label: "1:1" },
      { value: "3:4", label: "3:4" },
      { value: "9:16", label: "9:16" },
      { value: "21:9", label: "21:9" },
      { value: "adaptive", label: "自适应" },
    ],
    defaultDuration: 4,
    defaultResolution: "480p",
    defaultRatio: "16:9",
    requiresRatio: true,
    validateDuration: (duration: number) => duration >= 4 && duration <= 12,
    validateImages: (count: number) => count >= 1 && count <= 2,
  },

  runninghub: {
    value: "runninghub",
    label: "RunningHub",
    maxImages: 9,
    minImages: 1,
    durationOptions: [
      { value: 10, label: "10秒" },
      { value: 15, label: "15秒" },
    ],
    resolutionOptions: [
      { value: "16:9", label: "16:9" },
      { value: "9:16", label: "9:16" },
    ],
    defaultDuration: 10,
    defaultResolution: "16:9",
    requiresRatio: false,
    validateDuration: (duration: number) => duration === 10 || duration === 15,
    validateImages: (count: number) => count >= 1 && count <= 9,
  },

  // apimart: {
  //   value: "apimart",
  //   label: "apimart",
  //   maxImages: 9,
  //   minImages: 1,
  //   durationOptions: [
  //     { value: 10, label: "10秒" },
  //     { value: 15, label: "15秒" },
  //   ],
  //   resolutionOptions: [
  //     { value: "16:9", label: "16:9" },
  //     { value: "9:16", label: "9:16" },
  //   ],
  //   defaultDuration: 10,
  //   defaultResolution: "16:9",
  //   requiresRatio: false,
  //   validateDuration: (duration: number) => duration === 10 || duration === 15,
  //   validateImages: (count: number) => count >= 1 && count <= 9,
  // },
};

// 导出厂商列表
export const MANUFACTURER_LIST = Object.values(MANUFACTURER_CONFIGS);
