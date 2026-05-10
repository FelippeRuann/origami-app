const fs = require('fs');
const glob = require('glob');

function searchStringsInViews(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Basic regex: Look for > followed by spaces and a word regex, followed by <
    // Exclude if it's <Text> or if it's an end tag
    let line = lines[i];
    if (line.match(/>\s*[A-Za-z0-9]+\s*</) && !line.includes('<Text') && !line.includes('</Text>') && !line.includes('Feather')) {
       console.log(`Potential simple raw string in ${filePath}:${i+1} : ${line}`);
    }
  }
}

const files = glob.sync('src/**/*.jsx');
files.forEach(searchStringsInViews);
