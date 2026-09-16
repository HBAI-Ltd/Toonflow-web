import assert from "node:assert/strict";
import test from "node:test";
import { formatStructuredScriptJson, parseStructuredScriptJson } from "./structuredScript.ts";

const shot = (number: number) => ({
  number,
  title: `镜头${number}`,
  estimatedDurationSeconds: 5,
  claimIds: [`C${number}`],
  evidenceType: "原文事实",
  voiceover: `第${number}镜口播。`,
  visual: `第${number}镜画面。`,
  visualFunction: "展示现象",
  motion: "固定镜头",
  soundEffects: "",
});

const validScript = {
  schemaVersion: 1,
  title: "示例剧本",
  overview: {
    knowledgeStructure: "提出问题到回答",
    narrativeStance: "代入式",
    coreQuestion: "为什么？",
    coreConclusion: "因为信息发生变化。",
    voiceStyle: "清晰",
    estimatedDurationSeconds: 10,
    voiceWordCount: 12,
    shotCount: 2,
  },
  sections: [{
    id: "S1",
    title: "开场",
    estimatedDurationSeconds: 10,
    shots: [shot(1), shot(2)],
  }],
};

test("parses and formats a valid structured script", () => {
  const parsed = parseStructuredScriptJson(JSON.stringify(validScript));
  assert.equal(parsed.sections[0].shots[0].number, 1);
  assert.match(formatStructuredScriptJson(parsed), /\n  "schemaVersion": 1/);
});

test("reports malformed JSON as a syntax error", () => {
  assert.throws(() => parseStructuredScriptJson("{"), /剧本 JSON 语法错误/);
});

test("reports the failing field path", () => {
  const broken = structuredClone(validScript);
  broken.sections[0].shots[0].voiceover = "";
  assert.throws(() => parseStructuredScriptJson(JSON.stringify(broken)), /sections\[0\]\.shots\[0\]\.voiceover/);
});

