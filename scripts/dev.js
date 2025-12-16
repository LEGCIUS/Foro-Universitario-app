const { spawn } = require('child_process');
const readline = require('readline');
const os = require('os');

function prefixStream(stream, prefix) {
  const rl = readline.createInterface({ input: stream });
  rl.on('line', (line) => {
    // Avoid breaking Expo UI; we only prefix backend logs.
    process.stdout.write(`${prefix}${line}\n`);
  });
  return rl;
}

function isWindows() {
  return process.platform === 'win32';
}

function killProcessTree(child) {
  if (!child || !child.pid) return;
  if (isWindows()) {
    // Kill process tree on Windows
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function guessLanIpV4() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4') continue;
      if (net.internal) continue;
      candidates.push(net.address);
    }
  }

  // Prefer 192.168.x.x / 10.x.x.x style LAN ranges if present
  const preferred = candidates.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'));
  return preferred || candidates[0] || '127.0.0.1';
}

function run() {
  const apiPort = Number(process.env.EXPO_PUBLIC_API_PORT || 4000);
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL && String(process.env.EXPO_PUBLIC_API_URL).trim()
      ? String(process.env.EXPO_PUBLIC_API_URL).trim()
      : `http://${guessLanIpV4()}:${apiPort}`;

  console.log('Iniciando Expo + Backend...');
  console.log(`EXPO_PUBLIC_API_URL=${apiUrl}`);

  // 1) Backend (prefixed logs)
  const api = spawn('npm', ['--prefix', 'backend', 'start'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows(),
    env: process.env,
  });

  prefixStream(api.stdout, '[api] ');
  prefixStream(api.stderr, '[api] ');

  api.on('exit', (code) => {
    console.log(`[api] salió con código ${code}`);
  });

  // 2) Expo (TTY / inherit so QR & interactive UI show)
  const expo = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    shell: isWindows(),
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: apiUrl,
    },
  });

  expo.on('exit', (code) => {
    console.log(`[expo] salió con código ${code}`);
    // If Expo stops, stop API too.
    killProcessTree(api);
    process.exit(code ?? 0);
  });

  const shutdown = () => {
    console.log('\nCerrando procesos...');
    killProcessTree(expo);
    killProcessTree(api);
    setTimeout(() => process.exit(0), 200);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

run();
