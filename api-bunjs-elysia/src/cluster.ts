import { spawn } from "bun";
import { cpus } from "os";

const numCPUs = cpus().length;
const workers: any[] = [];

console.log(`🚀 Starting cluster with ${numCPUs} workers...`);

for (let i = 0; i < numCPUs; i++) {
    const worker = spawn(["bun", "run", "src/index.ts"], {
        stdout: "inherit",
        stderr: "inherit",
        env: { ...process.env },
    });
    workers.push(worker);
}

process.on("SIGINT", () => {
    console.log("\n🛑 Stopping cluster...");
    workers.forEach((worker) => worker.kill());
    process.exit(0);
});
