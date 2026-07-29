import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const out = path.resolve("tmp-screenshots");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await desktop.waitForTimeout(1000);
await desktop.screenshot({
  path: path.join(out, "redesign-login-desktop.png"),
  fullPage: true,
});

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await mobile.waitForTimeout(1000);
await mobile.screenshot({
  path: path.join(out, "redesign-login-mobile.png"),
  fullPage: true,
});

// Try login with admin/admin
await desktop.fill("#login-username", "admin");
await desktop.fill("#login-password", "admin");
await desktop.click('button[type="submit"]');
await desktop.waitForTimeout(2500);
await desktop.screenshot({
  path: path.join(out, "redesign-after-login.png"),
  fullPage: true,
});

console.log("URL:", desktop.url());
console.log("BODY:", (await desktop.locator("body").innerText()).slice(0, 500));
await browser.close();
console.log("Done:", out);
