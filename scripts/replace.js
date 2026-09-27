const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src', 'app', 'admin');

const replacements = [
    { regex: /bg-black\/40\b/g, replacement: 'bg-[var(--surface-bg)]' },
    { regex: /bg-black\/60\b/g, replacement: 'bg-[var(--surface-bg)]' },
    { regex: /bg-black\/90\b/g, replacement: 'bg-black/50 dark:bg-black/90' },
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            for (const { regex, replacement } of replacements) {
                content = content.replace(regex, replacement);
            }
            
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`Processed ${fullPath}`);
        }
    }
}

processDirectory(dirPath);
