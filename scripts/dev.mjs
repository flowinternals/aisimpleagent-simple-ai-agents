import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function findAvailablePort(startPort = 8787, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let port = startPort;

    const attempt = () => {
      if (port > startPort + maxAttempts) {
        reject(
          new Error(`No free port found between ${startPort} and ${startPort + maxAttempts - 1}.`),
        );
        return;
      }

      const probe = net.createServer();
      probe.once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          port += 1;
          attempt();
        } else {
          reject(err);
        }
      });
      probe.listen(port, () => {
        probe.close(() => resolve(port));
      });
    };

    attempt();
  });
}

async function main() {
  const explicitPort = process.env.PORT;
  const port = explicitPort ? Number(explicitPort) : await findAvailablePort();

  if (explicitPort && (!Number.isFinite(port) || port <= 0)) {
    throw new Error(`Invalid PORT: ${explicitPort}`);
  }

  const apiProxyTarget = `http://127.0.0.1:${port}`;
  const node = process.execPath;
  const viteEntry = path.join(root, "node_modules", "vite", "bin", "vite.js");
  if (!fs.existsSync(viteEntry)) {
    throw new Error(`Vite CLI not found at ${viteEntry}. Run npm install in ${root}.`);
  }

  const apiChild = spawn(node, ["server/index.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: "inherit",
  });

  const viteChild = spawn(node, [viteEntry], {
    cwd: root,
    env: { ...process.env, AISIMPLEAGENT_API_PROXY_TARGET: apiProxyTarget },
    stdio: "inherit",
  });

  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    apiChild.kill("SIGTERM");
    viteChild.kill("SIGTERM");
  };

  const exitBecausePeerDied = (code) => {
    if (shuttingDown) return;
    shutdown();
    process.exit(typeof code === "number" && code !== 0 ? code : 1);
  };

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });

  apiChild.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal || (code !== null && code !== 0)) exitBecausePeerDied(code ?? 1);
  });
  viteChild.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal || (code !== null && code !== 0)) exitBecausePeerDied(code ?? 1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
