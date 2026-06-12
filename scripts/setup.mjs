import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
process.chdir(root);

console.log("╔══════════════════════════════════╗");
console.log("║     Timii Local Setup            ║");
console.log("╚══════════════════════════════════╝\n");

// Step 1: Install dependencies
console.log("[1/3] Installing dependencies...");
execSync("npm install", { stdio: "inherit", cwd: root });
console.log("");

// Step 2: Seed database
console.log("[2/3] Seeding test data...");
const dataDir = join(root, "data");
if (!existsSync(dataDir)) {
  execSync(`mkdir "${dataDir}"`, { stdio: "inherit" });
}
execSync("npx tsx scripts/seed.ts", { stdio: "inherit", cwd: root });
console.log("");

// Step 3: Start dev server
console.log("[3/3] Starting dev server...");
console.log("  Open http://localhost:3000 in your browser\n");
console.log("  Test accounts (password: test1234):");
console.log("    alice@timii.dev — 小明");
console.log("    bob@timii.dev   — 小红");
console.log("    carol@timii.dev — 阿杰");
console.log("    dave@timii.dev  — 莉莉\n");

execSync("npm run dev", { stdio: "inherit", cwd: root });
