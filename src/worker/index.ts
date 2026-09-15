import { startWorkerProcess } from "./execution-worker";

startWorkerProcess().catch((err) => {
  console.error("Fatal error starting worker:", err);
  process.exit(1);
});
