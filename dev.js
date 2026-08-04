import { spawn } from 'child_process';

const server = spawn('node', ['server.js'], { stdio: 'inherit' });
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  server.kill();
  vite.kill();
  process.exit();
});
