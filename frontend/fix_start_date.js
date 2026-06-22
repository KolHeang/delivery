const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir(path.join(__dirname, 'src/app'));
let count = 0;

const helperToAdd = `
const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return \`\${year}-\${month}-01\`;
};
`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // If it has getLocalFirstDayOfMonthString called but not defined
  if (content.includes('getLocalFirstDayOfMonthString()') && !content.includes('const getLocalFirstDayOfMonthString')) {
    // Inject right after getLocalDateString definition
    const getLocalStrDefRegex = /const getLocalDateString = \([^)]*\) => {[^}]+};/m;
    const match = content.match(getLocalStrDefRegex);
    if (match) {
      content = content.replace(match[0], match[0] + '\n' + helperToAdd);
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log(`Fixed ${file}`);
    } else {
      // Just inject it after the imports
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextNewLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextNewLine + 1) + helperToAdd + content.slice(nextNewLine + 1);
        fs.writeFileSync(file, content, 'utf8');
        count++;
        console.log(`Fixed (fallback) ${file}`);
      }
    }
  }
});

console.log(`Done. Fixed ${count} files.`);
