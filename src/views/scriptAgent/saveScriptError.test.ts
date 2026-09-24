import assert from "node:assert/strict";
import test from "node:test";
import { getSaveScriptErrorMessage } from "./saveScriptError.ts";

test("uses the server message returned directly by the axios interceptor", () => {
  assert.equal(getSaveScriptErrorMessage({ message: "结构化剧本校验失败：sections[0]" }), "结构化剧本校验失败：sections[0]");
});

test("keeps Axios and Error message handling", () => {
  assert.equal(getSaveScriptErrorMessage({ response: { data: { message: "服务器错误" } } }), "服务器错误");
  assert.equal(getSaveScriptErrorMessage(new Error("网络错误")), "网络错误");
});
