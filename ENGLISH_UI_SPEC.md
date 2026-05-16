# Spec: Toonflow Web English UI Cleanup

## Objective
Make the deployed Toonflow web UI usable in English by removing visible hardcoded Chinese labels/descriptions from settings, prompt management, and other user-facing screens.

## Commands
- Audit Chinese strings: `python3 scripts/audit-english-ui.py`
- Build frontend: `yarn build-only`
- Deploy frontend: copy `dist/*` to `/opt/toonflow/data/web` on VM and re-inject web config shim

## Project Structure
- `src/components/setting/components/` → settings dialogs and cards
- `src/views/` → application screens
- `src/locales/language/en.json` → English translations
- `src/locales/language/zh-CN.json` → source translation key coverage

## Code Style
Use Vue i18n for static UI text:
```vue
<template>{{ $t('settings.agentConfig.scriptAgent') }}</template>
<script setup lang="ts">
const { t } = useI18n()
const label = computed(() => t('settings.agentConfig.scriptAgent'))
</script>
```

## Testing Strategy
- Static audit for Chinese characters in English translations and likely UI source strings.
- Build with `yarn build-only`.
- Smoke test `https://flow.bgzr.io` and login API.

## Boundaries
- Always: translate visible UI labels/descriptions to English.
- Ask first: changing backend schema or API state enums.
- Never: commit secrets, break Chinese parsing regexes, or change backend Chinese status values unless API is updated too.

## Success Criteria
- `en.json` has all `zh-CN.json` keys, with no empty values and no Chinese characters.
- Settings Agent Config cards show English names and descriptions.
- Prompt Management cards show English names and descriptions where seed/config data exists.
- Production build succeeds and deployed page loads.

## Open Questions
- Whether prompt templates themselves should be fully translated or only their visible titles/descriptions/snippets.
