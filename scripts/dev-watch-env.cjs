/**
 * Runs `next dev` and restarts it when `.env.local` or `.env` changes (Next only reads env at process start).
 */
const { spawn } = require('child_process');
const { watch, existsSync } = require('fs');
const path = require('path');

const root = process.cwd();
const envLocal = path.join(root, '.env.local');
const envDefault = path.join(root, '.env');

let child = null;
let debounce = null;

function runNext() {
  if (child) {
    child.kill('SIGTERM');
    child = null;
  }
  child = spawn('npx', ['next', 'dev'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal === 'SIGTERM' || signal === 'SIGINT') return;
    if (code !== 0 && code !== null) process.exit(code);
  });
}

function scheduleRestart(reason) {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`\n[dev] ${reason} — restarting Next.js…\n`);
    if (child) {
      child.once('exit', () => {
        child = null;
        setTimeout(runNext, 300);
      });
      child.kill('SIGTERM');
    } else {
      runNext();
    }
  }, 400);
}

function watchEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  watch(filePath, { persistent: true }, (eventType) => {
    if (eventType === 'change') scheduleRestart(path.basename(filePath) + ' changed');
  });
  console.log('[dev] watching', path.basename(filePath), 'for env changes');
}

runNext();
watchEnvFile(envLocal);
watchEnvFile(envDefault);

function shutdown() {
  if (child) child.kill('SIGINT');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
