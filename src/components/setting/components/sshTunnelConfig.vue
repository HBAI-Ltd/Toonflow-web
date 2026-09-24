<template>
  <div class="sshTunnelConfig">
    <p class="desc">{{ t("settings.sshTunnel.description") }}</p>
    <p class="hint">{{ t("settings.sshTunnel.fixedForward") }}</p>

    <label class="field">
      <span>{{ t("settings.sshTunnel.command") }}</span>
      <input v-model="form.sshCommand" :placeholder="t('settings.sshTunnel.commandPlaceholder')" @input="handleCommandChange" />
    </label>
    <p v-if="parsedSummary" class="hint">{{ t("settings.sshTunnel.parsedSummary") }}：{{ parsedSummary }}</p>
    <p v-else-if="form.sshCommand.trim()" class="warn">{{ t("settings.sshTunnel.parseFailed") }}</p>

    <label class="field">
      <span>{{ t("settings.sshTunnel.password") }}</span>
      <input
        v-model="form.password"
        type="password"
        :placeholder="hasPassword ? t('settings.sshTunnel.passwordSaved') : t('settings.sshTunnel.passwordPlaceholder')" />
    </label>

    <label class="check">
      <input v-model="form.autoConnect" type="checkbox" />
      <span>{{ t("settings.sshTunnel.autoConnect") }}</span>
    </label>

    <details class="manual">
      <summary>{{ t("settings.sshTunnel.manualFields") }}</summary>
      <label class="field">
        <span>{{ t("settings.sshTunnel.host") }}</span>
        <input v-model="form.host" @input="useManual = true" />
      </label>
      <label class="field">
        <span>{{ t("settings.sshTunnel.port") }}</span>
        <input v-model.number="form.port" type="number" min="1" max="65535" @input="useManual = true" />
      </label>
      <label class="field">
        <span>{{ t("settings.sshTunnel.username") }}</span>
        <input v-model="form.username" @input="useManual = true" />
      </label>
    </details>

    <p class="status">
      {{ t("settings.sshTunnel.sshLabel") }}：{{ stateText(status.sshState) }}
      &nbsp;&nbsp;
      {{ t("settings.sshTunnel.comfyLabel") }}：{{ stateText(status.comfyState) }}
    </p>
    <p v-if="status.errorMessage" class="warn">{{ t("settings.sshTunnel.lastError") }}：{{ status.errorMessage }}</p>
    <p v-if="status.retryAt" class="hint">{{ t("settings.sshTunnel.retryAt", { time: formatRetryAt(status.retryAt) }) }}</p>

    <div class="actions">
      <button type="button" class="primary" :disabled="busy" @click="saveAndConnect">{{ t("settings.sshTunnel.saveAndConnect") }}</button>
      <button v-if="showDisconnect" type="button" :disabled="busy" @click="disconnect">{{ t("settings.sshTunnel.disconnect") }}</button>
      <button v-if="showReconnect" type="button" :disabled="busy" @click="reconnect">{{ t("settings.sshTunnel.reconnect") }}</button>
      <button v-if="showStopRetry" type="button" :disabled="busy" @click="disconnect">{{ t("settings.sshTunnel.stopRetry") }}</button>
      <button type="button" :disabled="busy" @click="refresh">{{ t("settings.sshTunnel.refresh") }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";

const { t } = useI18n();

interface PublicSshTunnelConfig {
  configured: boolean;
  host?: string;
  port?: number;
  username?: string;
  autoConnect: boolean;
  hasPassword: boolean;
}

interface HostKeyChallenge {
  fingerprint: string;
  changed: boolean;
}

interface SshTunnelStatus {
  sshState: string;
  comfyState: string;
  errorCode?: string;
  errorMessage?: string;
  hostKeyChallenge?: HostKeyChallenge;
  retryAt?: number;
}

const UNSAFE_CHARACTERS = /[;&|><$`()]/;
const CONTROL_CHARACTERS = /[\u0001-\u001f\u007f]/;

const form = ref({
  sshCommand: "",
  password: "",
  autoConnect: true,
  host: "",
  port: 22,
  username: "",
});
const hasPassword = ref(false);
const useManual = ref(false);
const busy = ref(false);
const status = ref<SshTunnelStatus>({ sshState: "unconfigured", comfyState: "unknown" });
const promptedFingerprint = ref("");
let pollTimer: ReturnType<typeof setInterval> | undefined;

const parsedTarget = computed(() => parseLocalCommand(form.value.sshCommand));
const parsedSummary = computed(() => {
  const target = parsedTarget.value;
  if (!target) return "";
  return `${target.username}@${target.host}:${target.port}`;
});
const showDisconnect = computed(() => ["connecting", "connected"].includes(status.value.sshState));
const showReconnect = computed(() => ["disconnected", "auth_failed", "error"].includes(status.value.sshState));
const showStopRetry = computed(() => status.value.sshState === "reconnecting");

function stateText(state: string): string {
  return t(`settings.sshTunnel.state.${state}`);
}

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function parseLocalCommand(command: string): { host: string; port: number; username: string } | undefined {
  try {
    const value = command.trim();
    if (!value || CONTROL_CHARACTERS.test(value) || UNSAFE_CHARACTERS.test(value)) return undefined;
    const tokens = value.split(/\s+/);
    if (tokens.shift()?.toLowerCase() !== "ssh") return undefined;
    let port = 22;
    let hasPort = false;
    let target: string | undefined;
    while (tokens.length > 0) {
      const token = tokens.shift()!;
      if (token === "-p") {
        if (hasPort || tokens.length === 0) return undefined;
        hasPort = true;
        port = Number(tokens.shift());
        continue;
      }
      if (token.startsWith("-p") && token.length > 2) {
        if (hasPort) return undefined;
        hasPort = true;
        port = Number(token.slice(2));
        continue;
      }
      if (token.startsWith("-") || target !== undefined) return undefined;
      target = token;
    }
    if (!target || !Number.isInteger(port) || port < 1 || port > 65535) return undefined;
    const separator = target.indexOf("@");
    if (separator <= 0 || separator !== target.lastIndexOf("@")) return undefined;
    return { username: target.slice(0, separator), host: target.slice(separator + 1), port };
  } catch {
    return undefined;
  }
}

function reconstructCommand(host: string, port: number, username: string): string {
  return `ssh -p ${port} ${username}@${host}`;
}

function handleCommandChange() {
  useManual.value = false;
  const parsed = parsedTarget.value;
  if (!parsed) return;
  form.value.host = parsed.host;
  form.value.port = parsed.port;
  form.value.username = parsed.username;
}

function payload() {
  const password = form.value.password === "" ? undefined : form.value.password;
  if (useManual.value) {
    return {
      host: form.value.host,
      port: Number(form.value.port),
      username: form.value.username,
      password,
      autoConnect: form.value.autoConnect,
    };
  }
  return {
    sshCommand: form.value.sshCommand,
    password,
    autoConnect: form.value.autoConnect,
  };
}

function applyStatus(next: SshTunnelStatus) {
  if (!next || typeof next !== "object") return;
  status.value = {
    sshState: next.sshState || "unconfigured",
    comfyState: next.comfyState || "unknown",
    errorCode: next.errorCode,
    errorMessage: next.errorMessage,
    hostKeyChallenge: next.hostKeyChallenge,
    retryAt: next.retryAt,
  };
  maybeConfirmHost(status.value);
}

function maybeConfirmHost(next: SshTunnelStatus) {
  const challenge = next.hostKeyChallenge;
  const needsConfirm = next.errorCode === "SSH_HOST_KEY_REQUIRED" || next.errorCode === "SSH_HOST_KEY_CHANGED";
  if (!needsConfirm || !challenge || challenge.fingerprint === promptedFingerprint.value) return;
  promptedFingerprint.value = challenge.fingerprint;
  const dialog = DialogPlugin.confirm({
    header: t("settings.sshTunnel.confirmFingerprint"),
    body: `${challenge.changed ? t("settings.sshTunnel.hostKeyChanged") : t("settings.sshTunnel.hostKeyUnknown")}\n${challenge.fingerprint}`,
    confirmBtn: t("settings.sshTunnel.confirm"),
    cancelBtn: t("settings.sshTunnel.cancel"),
    theme: "warning",
    onConfirm: async () => {
      try {
        const res = await axios.post("/setting/sshTunnel/confirmHost", { fingerprint: challenge.fingerprint });
        applyStatus(unwrap<SshTunnelStatus>(res));
        form.value.password = "";
      } catch (error: any) {
        window.$message.error(error?.message || t("settings.sshTunnel.operationFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

async function loadConfig() {
  const res = await axios.get("/setting/sshTunnel/config");
  const config = unwrap<PublicSshTunnelConfig>(res);
  if (!config) return;
  hasPassword.value = Boolean(config.hasPassword);
  form.value.autoConnect = config.autoConnect !== false;
  if (config.host && config.port && config.username) {
    form.value.host = config.host;
    form.value.port = config.port;
    form.value.username = config.username;
    form.value.sshCommand = reconstructCommand(config.host, config.port, config.username);
  }
  form.value.password = "";
}

async function pollStatus() {
  try {
    const res = await axios.get("/setting/sshTunnel/status");
    applyStatus(unwrap<SshTunnelStatus>(res));
  } catch {
    // Keep the last known status while the page remains mounted.
  }
}

async function saveAndConnect() {
  if (!useManual.value && !form.value.sshCommand.trim()) {
    window.$message.warning(t("settings.sshTunnel.commandRequired"));
    return;
  }
  if (useManual.value && (!form.value.host || !form.value.username || !form.value.port)) {
    window.$message.warning(t("settings.sshTunnel.manualRequired"));
    return;
  }
  busy.value = true;
  try {
    const res = await axios.post("/setting/sshTunnel/connect", payload());
    applyStatus(unwrap<SshTunnelStatus>(res));
    form.value.password = "";
    hasPassword.value = true;
    await loadConfig();
  } catch (error: any) {
    window.$message.error(error?.message || t("settings.sshTunnel.operationFailed"));
  } finally {
    busy.value = false;
  }
}

async function disconnect() {
  busy.value = true;
  try {
    const res = await axios.post("/setting/sshTunnel/disconnect");
    applyStatus(unwrap<SshTunnelStatus>(res));
  } catch (error: any) {
    window.$message.error(error?.message || t("settings.sshTunnel.operationFailed"));
  } finally {
    busy.value = false;
  }
}

async function reconnect() {
  busy.value = true;
  try {
    const res = await axios.post("/setting/sshTunnel/reconnect");
    applyStatus(unwrap<SshTunnelStatus>(res));
  } catch (error: any) {
    window.$message.error(error?.message || t("settings.sshTunnel.operationFailed"));
  } finally {
    busy.value = false;
  }
}

async function refresh() {
  busy.value = true;
  try {
    const res = await axios.post("/setting/sshTunnel/refresh");
    applyStatus(unwrap<SshTunnelStatus>(res));
  } catch (error: any) {
    window.$message.error(error?.message || t("settings.sshTunnel.operationFailed"));
  } finally {
    busy.value = false;
  }
}

function formatRetryAt(retryAt: number): string {
  return new Date(retryAt).toLocaleTimeString();
}

onMounted(async () => {
  try {
    await loadConfig();
    await pollStatus();
  } catch (error: any) {
    window.$message.error(error?.message || t("settings.sshTunnel.operationFailed"));
  }
  pollTimer = setInterval(() => {
    void pollStatus();
  }, 2000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style lang="scss" scoped>
.sshTunnelConfig {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
  color: #1a1a1a;
}
.desc,
.hint,
.status,
.warn {
  margin: 0;
  line-height: 1.5;
}
.hint,
.status {
  color: #666;
}
.warn {
  color: #d54941;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
}
.manual {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px 12px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.actions button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.actions .primary {
  background: #0052d9;
  border-color: #0052d9;
  color: #fff;
}
.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
