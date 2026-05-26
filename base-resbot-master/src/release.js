// npm run release "update fitur serializer"

import { execSync } from "child_process";

const commitMessage = process.argv[2] || "update";

try {
  console.log("🚀 Starting release process...");

  // Pastikan Git clean
  const gitStatus = execSync("git status --porcelain").toString().trim();
  if (gitStatus === "") {
    console.log("✅ Git working directory is clean.");
  } else {
    console.log("📦 Committing changes...");
    execSync("git add .", { stdio: "inherit" });
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
  }

  // 1️⃣ Naikkan versi otomatis (patch)
  console.log("🔼 Bumping npm version...");
  execSync('npm version patch -m "🔖 %s - ' + commitMessage + '"', {
    stdio: "inherit",
  });

  // 2️⃣ Push ke GitHub (termasuk tag versi)
  console.log("🚀 Pushing to GitHub...");
  execSync("git push origin master --tags", { stdio: "inherit" });

  // 3️⃣ Publish ke npm
  console.log("📦 Publishing to npm...");
  execSync("npm publish --access public", { stdio: "inherit" });

  console.log("\n✅ Release complete!");
} catch (err) {
  console.error("❌ Error during release:", err.message);
  process.exit(1);
}
