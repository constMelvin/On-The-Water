// One command for a release APK: bump the app version, regenerate android/, build.
//   npm run build:android            -> minor bump (1.1.0 -> 1.2.0)
//   npm run build:android -- major   -> major bump (1.1.0 -> 2.0.0)
//   npm run build:android -- same    -> no bump (re-run a build that never finished)
// The APK is signed with the debug key (fine for testing, not for the Play Store).
// On Windows the build's temp files, Metro cache and npm cache go to D: so C: doesn't fill up
// (Gradle's own home is already D:\Gradle\home via GRADLE_USER_HOME). Override with OTW_BUILD_TMP.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const kind = process.argv[2] ?? 'minor';
if (kind !== 'minor' && kind !== 'major' && kind !== 'same') {
  console.error(`Usage: npm run build:android [-- minor|major|same]   (got "${kind}")`);
  process.exit(1);
}

const env = { ...process.env, CI: '1' };
if (process.platform === 'win32') {
  const tmp = process.env.OTW_BUILD_TMP ?? 'D:\\Temp\\otw-build';
  const npmCache = 'D:\\npm-cache';
  try {
    mkdirSync(tmp, { recursive: true });
    mkdirSync(npmCache, { recursive: true });
    Object.assign(env, { TEMP: tmp, TMP: tmp, npm_config_cache: npmCache });
  } catch {
    console.warn('D: is not available: the build will use the default temp and npm cache folders.');
  }
}

const run = (command, cwd) => execSync(command, { stdio: 'inherit', cwd, env });

if (kind !== 'same') run(`npm run bump -- ${kind}`);
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
console.log(`\n== Building OTW ${version} (${kind === 'same' ? 'no bump' : `${kind} bump`}) ==\n`);

run('npx expo prebuild --platform android --no-install');
run(process.platform === 'win32' ? '.\\gradlew.bat assembleRelease' : './gradlew assembleRelease', 'android');

console.log(`\nDone: OTW ${version}\n  ${process.cwd()}\\android\\app\\build\\outputs\\apk\\release\\app-release.apk`);
