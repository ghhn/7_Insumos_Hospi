const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const archiveDir = path.join(rootDir, 'scripts', 'archive');

// Create archive dir if it doesn't exist
if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
}

// Files we want to KEEP in the root directory
const whitelist = new Set([
    '.env',
    '.gitignore',
    '.mcp.json',
    'skills-lock.json',
    'README.md',
    'DOCUMENTACION_COMPLETA_SISTEMA.md',
    'DOCUMENTACION_COMPLETA_SISTEMA.pdf',
    'SQL_Architecture_Master_Guide.md',
    'APUS_Extraidos.json',
    'NUEVA_DATA.xlsx',
    'clean_root.js' // this script
]);

// Directories to KEEP in root
const dirWhitelist = new Set([
    '.git',
    '.agents',
    '.claude',
    'frontend',
    'scripts',
    'node_modules',
    'venv311'
]);

fs.readdirSync(rootDir).forEach(item => {
    const itemPath = path.join(rootDir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
        if (!dirWhitelist.has(item) && item !== 'scripts') {
             // Move directory to archive
             fs.renameSync(itemPath, path.join(archiveDir, item));
             console.log(`Moved directory ${item} to archive`);
        }
    } else {
        if (!whitelist.has(item)) {
            // Move file to archive
            fs.renameSync(itemPath, path.join(archiveDir, item));
            console.log(`Moved file ${item} to archive`);
        }
    }
});
console.log("Cleanup complete!");
