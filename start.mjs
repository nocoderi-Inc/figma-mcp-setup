#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import http from "node:http";

const IS_WIN = platform() === "win32";
const PID_FILE = join(homedir(), ".figma-mcp.pid");
const PORT = 3055;

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function log(msg) { console.log(msg); }

function checkPort() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/status`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const status = JSON.parse(data);
          resolve({ running: true, status });
        } catch {
          resolve({ running: true, status: null });
        }
      });
    });
    req.on("error", () => resolve({ running: false }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ running: false }); });
  });
}

async function showStatus() {
  const { running, status } = await checkPort();
  if (running) {
    log(`${COLORS.green}[RUNNING]${COLORS.reset} WebSocketサーバーはポート ${PORT} で稼働中`);
    if (status) {
      log(`  接続数: ${status.stats?.activeConnections ?? 0}`);
      log(`  稼働時間: ${Math.round(status.uptime ?? 0)}秒`);
    }
  } else {
    log(`${COLORS.yellow}[STOPPED]${COLORS.reset} WebSocketサーバーは停止中`);
  }
}

function stopServer() {
  if (!existsSync(PID_FILE)) {
    log(`${COLORS.yellow}[INFO]${COLORS.reset} PIDファイルが見つかりません`);
    return;
  }

  const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
  try {
    process.kill(pid, "SIGTERM");
    unlinkSync(PID_FILE);
    log(`${COLORS.green}[OK]${COLORS.reset} サーバーを停止しました (PID: ${pid})`);
  } catch {
    unlinkSync(PID_FILE);
    log(`${COLORS.yellow}[INFO]${COLORS.reset} プロセスは既に終了していました`);
  }
}

async function startServer(background) {
  const { running } = await checkPort();
  if (running) {
    log(`${COLORS.yellow}[INFO]${COLORS.reset} サーバーは既にポート ${PORT} で稼働中です`);
    return;
  }

  const npxCmd = IS_WIN ? "npx.cmd" : "npx";
  const args = ["-p", "claude-talk-to-figma-mcp@latest", "claude-talk-to-figma-mcp-socket"];

  if (background) {
    const child = spawn(npxCmd, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    writeFileSync(PID_FILE, String(child.pid));
    log(`${COLORS.green}[OK]${COLORS.reset} バックグラウンドで起動 (PID: ${child.pid})`);
    log(`  停止: ${COLORS.cyan}npx figma-mcp-start --stop${COLORS.reset}`);
  } else {
    log(`${COLORS.cyan}[INFO]${COLORS.reset} WebSocketサーバーを起動中... (Ctrl+C で停止)`);
    log("");

    const child = spawn(npxCmd, args, {
      stdio: "inherit",
    });

    child.on("error", (err) => {
      log(`${COLORS.red}[ERROR]${COLORS.reset} 起動に失敗: ${err.message}`);
      log("  Node.js がインストールされているか確認してください");
    });

    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        log(`${COLORS.yellow}[INFO]${COLORS.reset} サーバーが終了しました (code: ${code})`);
      }
    });

    process.on("SIGINT", () => {
      child.kill("SIGTERM");
      process.exit(0);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case "--status":
    case "-s":
      await showStatus();
      break;
    case "--stop":
      stopServer();
      break;
    case "--bg":
    case "-d":
    case "--daemon":
      await startServer(true);
      break;
    case "--help":
    case "-h":
      log(`
${COLORS.bold}Figma MCP WebSocketサーバー${COLORS.reset}

使い方:
  npx figma-mcp-start              フォアグラウンドで起動
  npx figma-mcp-start --bg         バックグラウンドで起動
  npx figma-mcp-start --stop       バックグラウンドサーバーを停止
  npx figma-mcp-start --status     サーバーの状態を確認
`);
      break;
    default:
      await startServer(false);
  }
}

main().catch((e) => {
  log(`${COLORS.red}[ERROR]${COLORS.reset} ${e.message}`);
  process.exit(1);
});
