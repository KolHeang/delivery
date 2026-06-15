const fs = require('fs');
const ts = require('typescript');

const fileContent = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

const sourceFile = ts.createSourceFile(
  'page.tsx',
  fileContent,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

let hasError = false;
function visit(node) {
  if (node.kind === ts.SyntaxKind.JsxText && node.text.includes('</div>')) {
    // maybe there's some text containing </div>
  }
  ts.forEachChild(node, visit);
}
visit(sourceFile);

// Check diagnostics
const program = ts.createProgram(['src/app/dashboard/page.tsx'], { jsx: ts.JsxEmit.React });
const diagnostics = ts.getPreEmitDiagnostics(program);

diagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
  } else {
    console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  }
});
