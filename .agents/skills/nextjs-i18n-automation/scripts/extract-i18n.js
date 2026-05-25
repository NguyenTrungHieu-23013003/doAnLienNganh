const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles([
  'src/app/**/*.tsx',
  'src/shared/**/*.tsx',
]);

const englishStrings = new Set();

sourceFiles.forEach(sourceFile => {
  let modified = false;

  // 1. Find all JSX Text nodes
  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  
  jsxTexts.forEach(jsxText => {
    const text = jsxText.getLiteralText().trim();
    if (text.length > 0 && /[a-zA-Z]/.test(text)) {
      // Must contain some letter, ignoring pure whitespace or symbols like "→" or "·"
      if (text === '→' || text === '·' || text === '-') return;
      englishStrings.add(text);
      jsxText.replaceWithText(`{t("${text.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\'")}")}`);
      modified = true;
    }
  });

  const attrs = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  attrs.forEach(attr => {
    try {
      if (typeof attr.getName === 'function') {
        const name = attr.getName();
        if (['title', 'subtitle', 'placeholder', 'label'].includes(name)) {
          const init = attr.getInitializer();
          if (init && init.getKind() === SyntaxKind.StringLiteral) {
            const text = init.getLiteralText();
            if (text && /[a-zA-Z]/.test(text)) {
              englishStrings.add(text);
              attr.setInitializer(`{t("${text.replace(/"/g, '\\\\\\"').replace(/'/g, "\\\\'")}")}`);
              modified = true;
            }
          }
        }
      }
    } catch (e) {}
  });

  if (modified) {
    console.log('Modified:', sourceFile.getFilePath());

    // 3. Ensure useTranslation is imported
    const hasImport = sourceFile.getImportDeclaration('react-i18next');
    if (!hasImport) {
      sourceFile.addImportDeclaration({
        namedImports: ['useTranslation'],
        moduleSpecifier: 'react-i18next'
      });
    }

    // 4. Ensure useTranslation hook is added inside the top-level React component
    const functions = sourceFile.getFunctions();
    const arrowFunctions = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction);
    const varDecls = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
    
    // Attempt to inject Hook in all exported functions that return JSX
    const addHookToScope = (node) => {
      const body = node.getBody();
      if (body && body.getKind() === SyntaxKind.Block) {
        const block = body;
        const statements = block.getStatements();
        const hasHook = statements.some(s => s.getText().includes('useTranslation('));
        if (!hasHook) {
          block.insertStatements(0, 'const { t } = useTranslation();');
        }
      }
    };

    functions.forEach(f => { if (f.isExported()) addHookToScope(f); });
    varDecls.forEach(v => {
      const init = v.getInitializer();
      if (init && init.getKind() === SyntaxKind.ArrowFunction && v.isExported()) {
         addHookToScope(init);
      }
    });

    sourceFile.saveSync();
  }
});

if (englishStrings.size > 0) {
    const translationFile = 'src/mockDb/locales/en/translation.json';
    let translations = {};
    if (fs.existsSync(translationFile)) {
        translations = JSON.parse(fs.readFileSync(translationFile, 'utf-8'));
    }
    englishStrings.forEach(str => {
        if (!translations[str]) {
            translations[str] = str;
        }
    });
    fs.writeFileSync(translationFile, JSON.stringify(translations, null, 2));
    console.log(`\n✅ Saved ${englishStrings.size} extracted strings to ${translationFile}`);
    console.log(`Run 'npm run translate' to translate them.`);
} else {
    console.log('No new texts found.');
}
