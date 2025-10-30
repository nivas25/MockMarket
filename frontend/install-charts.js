#!/usr/bin/env node

/**
 * Script to install lightweight-charts package for beautiful stock charts
 */

const { execSync } = require("child_process");

console.log("📦 Installing lightweight-charts...\n");

try {
  execSync("npm install lightweight-charts", {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  console.log("\n✅ Successfully installed lightweight-charts!");
  console.log("💡 You can now use TradingView-style charts in your app\n");
} catch (error) {
  console.error("\n❌ Failed to install lightweight-charts");
  console.error("Please run manually: npm install lightweight-charts\n");
  process.exit(1);
}
