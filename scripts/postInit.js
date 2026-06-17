#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

process.on('SIGINT', () => {
  console.log('\n[postInit] Process interrupted by user. No further changes were applied.');
  process.exit(0);
});

const PLACEHOLDER_NAME = 'RnFeatureBoundary';
const cwd = process.cwd();
const appJsonPath = path.join(cwd, 'app.json');
const pkgJsonPath = path.join(cwd, 'package.json');

function getProjectName() {
  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      if (appJson.name) return appJson.name;
    } catch (_) {
      /* ignore */
    }
  }
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkg.name) return pkg.name;
    } catch (_) {
      /* ignore */
    }
  }
  return path.basename(cwd);
}

const projectName = getProjectName();
const projectNameLower = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

function log(msg) {
  console.log(`[postInit] ${msg}`);
}

function warn(msg) {
  console.warn(`[postInit] ⚠️  ${msg}`);
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function replaceInFile(filePath, search, replace) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(search)) return false;
  fs.writeFileSync(filePath, content.split(search).join(replace));
  return true;
}

function renameAndroidPackage() {
  log('Processing Android package...');

  const mainActivityPath = (function find() {
    let result = null;
    walkDir(path.join(cwd, 'android'), (fp) => {
      if (/MainActivity\.(kt|java)$/.test(fp)) result = fp;
    });
    return result;
  })();

  if (!mainActivityPath) {
    warn('MainActivity.kt/java not found in android/. Skipping Android rename.');
    return;
  }

  const content = fs.readFileSync(mainActivityPath, 'utf8');
  const packageMatch = content.match(/package\s+([a-zA-Z0-9._]+)/);
  if (!packageMatch) {
    warn('Could not parse package declaration from MainActivity. Skipping Android rename.');
    return;
  }

  const oldPackage = packageMatch[1];
  const oldParts = oldPackage.split('.');
  const newPackage = [...oldParts.slice(0, -1), projectNameLower].join('.');

  if (oldPackage === newPackage) {
    log('Android package already correct.');
    return;
  }

  let updatedFiles = 0;
  walkDir(path.join(cwd, 'android'), (fp) => {
    if (/\.(kt|java)$/.test(fp)) {
      if (replaceInFile(fp, oldPackage, newPackage)) updatedFiles++;
    }
  });
  log(`Updated package declaration in ${updatedFiles} Android file(s).`);

  const buildGradle = path.join(cwd, 'android', 'app', 'build.gradle');
  if (replaceInFile(buildGradle, oldPackage, newPackage)) {
    log('Updated android/app/build.gradle applicationId.');
  }

  const settingsGradle = path.join(cwd, 'android', 'settings.gradle');
  if (fs.existsSync(settingsGradle)) {
    replaceInFile(settingsGradle, PLACEHOLDER_NAME, projectName);
  }

  const activityDir = path.dirname(mainActivityPath);
  const parentDir = path.dirname(activityDir);
  const newDir = path.join(parentDir, projectNameLower);

  if (activityDir !== newDir && fs.existsSync(activityDir) && !fs.existsSync(newDir)) {
    fs.renameSync(activityDir, newDir);
    log(`Renamed package directory to ${path.relative(cwd, newDir)}.`);
  }
}

function renameIos() {
  log('Processing iOS project...');

  const iosDir = path.join(cwd, 'ios');
  if (!fs.existsSync(iosDir)) {
    warn('ios/ directory not found. Skipping iOS rename.');
    return;
  }

  const oldDir = path.join(iosDir, PLACEHOLDER_NAME);
  const newDir = path.join(iosDir, projectName);

  if (fs.existsSync(oldDir) && oldDir !== newDir) {
    if (!fs.existsSync(newDir)) {
      fs.renameSync(oldDir, newDir);
      log(`Renamed ios/${PLACEHOLDER_NAME} -> ios/${projectName}.`);
    }
  }

  let replaced = 0;
  walkDir(iosDir, (fp) => {
    if (replaceInFile(fp, PLACEHOLDER_NAME, projectName)) replaced++;
  });
  if (replaced > 0) {
    log(`Replaced ${PLACEHOLDER_NAME} in ${replaced} iOS file(s).`);
  }
}

// Execute
try {
  renameAndroidPackage();
} catch (e) {
  warn(`Android rename error: ${e.message}`);
}

try {
  renameIos();
} catch (e) {
  warn(`iOS rename error: ${e.message}`);
}

log('Done.');
