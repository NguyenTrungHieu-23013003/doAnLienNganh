---
name: nextjs-i18n-automation
description: Automate internationalization (i18n) setup for a Next.js App Router codebase. Features AST-based auto-extraction of TSX static text, integration with react-i18next using static imports instead of http-backend, and auto-translation scripts avoiding API keys. Use when user wants to translate their app, extract text, or build a scalable multi-language setup.
---

# Next.js i18n Automation & Best Practices

This skill outlines how to implement a fully automated localization workflow in Next.js. Avoid manual repetitive translation or broken HTTP imports.

## Core Principles

1. **Static JSON Imports**: In modular React apps, DO NOT rely on `i18next-http-backend` and `/public` folders because it requires asynchronous fetching which can disrupt immediate UI renders and state persistence.
   - Store `.json` translation dictionaries in `src/mockDb/locales/` or `src/locales/`.
   - Statically import them in the setup (e.g., `import en from '@/locales/en.json'`).

2. **Automated AST Extraction**: NEVER ask the developer to manually find and replace a hundred `<p>English</p>` tags into `<p>{t('English')}</p>`. Provide an AST Codemod (via `ts-morph`) that auto-injects `useTranslation` and replaces node texts.

3. **Auto Translation via Unofficial API**: Use `@vitalets/google-translate-api` in a Node script to automatically translate the source of truth (`en.json`) into all requested languages while preserving manual overrides.

## Workflow

### 1. Setup Locale Configuration
Create `src/features/settings/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en/translation.json';
import vi from '@/locales/vi/translation.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
```

### 2. Auto-Extract JSX Strings
When users ask to translate a project, write an Extraction Script (like `scripts/extract-i18n.js`) using `ts-morph`:
1. Find all `JsxText` & `JsxAttribute` strings.
2. Check `/[a-zA-Z]/` to verify it has words.
3. Call `jsxText.replaceWithText(\`{t("\${text}")}\`)`.
4. Ensure `useTranslation` hook is injected into the component function body.
5. Save the strings to `locales/en/translation.json`.

*(See bundle for `extract-i18n.js` and `translate.js` examples)*

### 3. Run Auto-Translate
Add to `package.json`: `"translate": "node scripts/translate.js"`.
The script reads `en.json`, translates missing keys, and saves to `vi.json`.
