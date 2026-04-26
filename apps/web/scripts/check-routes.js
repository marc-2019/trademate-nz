const fs = require('fs');
const path = require('path');
const glob = require('glob');

function getRoutes(baseDir) {
  const routes = new Set();
  const walk = (dir, currentPath) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      if (file === 'page.tsx') {
        routes.add(currentPath);
      } else if (isDirectory && file !== '[...catchall]') {
        const segment = file.startsWith('[') ? file : `/${file}`;
        walk(fullPath, path.posix.join(currentPath, segment));
      }
    });
  };
  walk(baseDir, '/');
  return routes;
}

function main() {
  const appDir = path.resolve(__dirname, '../app');
  const routes = getRoutes(appDir);
  const files = glob.sync('../src/**/*.+(js|jsx|ts|tsx)', { cwd: __dirname });

  let failed = false;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /<Link\s+href=["']([^"']*)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const href = match[1];
      if (!isExternal(href) && !routes.has(href)) {
        console.error(`Invalid route in ${file}: ${href}`);
        failed = true;
      }
    }

    const pushRegex = /router\.push\(["']([^"']*)["']/g;
    let pushMatch;
    while ((pushMatch = pushRegex.exec(content)) !== null) {
      const path = pushMatch[1];
      if (!isExternal(path) && !routes.has(path)) {
        console.error(`Invalid route in ${file}: ${path}`);
        failed = true;
      }
    }
  });

  if (failed) process.exit(1);
}

function isExternal(url) {
  return /^https?:\/\/|mailto:|tel:/.test(url);
}

main();