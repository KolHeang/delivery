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
  let original = content;
  
  // Only process files that have a startDate initialized with getLocalDateString
  if (content.includes('const [startDate, setStartDate] = useState(() => getLocalDateString());')) {
    
    // Add the helper if not already there
    if (!content.includes('getLocalFirstDayOfMonthString')) {
      const getLocalStrDef = `const getLocalDateString = (d: Date = new Date()) => {\n  const year = d.getFullYear();\n  const month = String(d.getMonth() + 1).padStart(2, '0');\n  const day = String(d.getDate()).padStart(2, '0');\n  return \`\${year}-\${month}-\${day}\`;\n};`;
      
      if (content.includes(getLocalStrDef)) {
        content = content.replace(getLocalStrDef, getLocalStrDef + '\n' + helperToAdd);
      } else {
         // Fallback if formatting is different
         const fallbackDef = "return `${year}-${month}-${day}`;\n};";
         content = content.replace(fallbackDef, fallbackDef + '\n' + helperToAdd);
      }
    }
    
    // Replace the state initialization
    content = content.replace(
      'const [startDate, setStartDate] = useState(() => getLocalDateString());',
      'const [startDate, setStartDate] = useState(() => getLocalFirstDayOfMonthString());'
    );
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Done. Updated ${count} files.`);
