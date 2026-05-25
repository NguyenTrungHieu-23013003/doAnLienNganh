#!/usr/bin/env node
/**
 * Auto-translate script using Google Translate (no API key required)
 *
 * Usage:
 *   npm run translate              → translate to all configured languages
 *   npm run translate -- --lang vi → translate only to Vietnamese
 *
 * Workflow:
 *   1. Edit public/locales/en/translation.json (source of truth)
 *   2. Run: npm run translate
 *   3. Review public/locales/<lang>/translation.json
 *   4. Optionally fix any mistranslated keys by hand
 */

const { translate } = require('@vitalets/google-translate-api');
const fs = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

/** Add more languages here. Key = locale folder name, value = Google Translate code. */
const TARGET_LANGUAGES = {
  vi: 'vi',   // Vietnamese
  // ja: 'ja', // Japanese  ← uncomment to add
  // ko: 'ko', // Korean
  // fr: 'fr', // French
  // zh: 'zh', // Chinese (Simplified)
};

/**
 * Keys where human translation is preferred over AI.
 * These will still be auto-translated but marked with "[REVIEW]" prefix in the output.
 */
const REVIEW_KEYS = [];

// ─── Paths ────────────────────────────────────────────────────────────────────

const LOCALES_DIR = path.join(__dirname, '../src/mockDb/locales');
const SOURCE_FILE = path.join(LOCALES_DIR, 'en/translation.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Delay between requests to avoid rate limiting */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Translate a single string.
 * Returns the translated text, or the original if translation fails.
 */
async function translateText(text, targetLang, key) {
  try {
    const result = await translate(text, { to: targetLang });
    const translated = result.text;
    return REVIEW_KEYS.includes(key) ? `[REVIEW] ${translated}` : translated;
  } catch (err) {
    console.warn(`  ⚠️  Failed to translate key "${key}": ${err.message}`);
    return text; // fallback to English
  }
}

/**
 * Translate all keys in a flat JSON object.
 * Preserves any existing manual overrides in the target file if
 * the value does not start with "[REVIEW]".
 */
async function translateJson(sourceObj, targetLang, existingObj = {}) {
  const result = {};
  const keys = Object.keys(sourceObj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const sourceValue = sourceObj[key];

    // Preserve manual human overrides (non-empty, non-[REVIEW] values)
    if (
      existingObj[key] &&
      !existingObj[key].startsWith('[REVIEW]') &&
      existingObj[key] !== sourceValue
    ) {
      result[key] = existingObj[key];
      process.stdout.write(`  ✓ [kept]       "${key}"\n`);
    } else {
      process.stdout.write(`  → [translating] "${key}" ...`);
      result[key] = await translateText(sourceValue, targetLang, key);
      process.stdout.write(` "${result[key]}"\n`);
      // Small delay to avoid hitting rate limits
      await sleep(120);
    }
  }

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse --lang flag
  const langFlag = process.argv.indexOf('--lang');
  const onlyLang = langFlag !== -1 ? process.argv[langFlag + 1] : null;

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ Source file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  const sourceJson = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
  const languages = onlyLang
    ? { [onlyLang]: TARGET_LANGUAGES[onlyLang] }
    : TARGET_LANGUAGES;

  if (onlyLang && !TARGET_LANGUAGES[onlyLang]) {
    console.error(`❌ Unknown language: "${onlyLang}". Available: ${Object.keys(TARGET_LANGUAGES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🌐 Auto-translate — source: src/mockDb/locales/en/translation.json`);
  console.log(`   Keys to translate: ${Object.keys(sourceJson).length}`);
  console.log(`   Target languages:  ${Object.keys(languages).join(', ')}\n`);

  for (const [locale, googleCode] of Object.entries(languages)) {
    const outDir = path.join(LOCALES_DIR, locale);
    const outFile = path.join(outDir, 'translation.json');

    // Load existing file to preserve human overrides
    const existing = fs.existsSync(outFile)
      ? JSON.parse(fs.readFileSync(outFile, 'utf-8'))
      : {};

    console.log(`\n🔤 Translating → ${locale} (${googleCode})`);
    console.log('─'.repeat(50));

    const translated = await translateJson(sourceJson, googleCode, existing);

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(translated, null, 2) + '\n', 'utf-8');

    console.log(`\n✅ Saved: src/mockDb/locales/${locale}/translation.json`);
  }

  console.log('\n🎉 Done! Review any [REVIEW] tagged values before shipping.\n');
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
