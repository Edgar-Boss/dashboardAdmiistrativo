import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const out = path.resolve("tmp-screenshots");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.addInitScript(() => {
  localStorage.setItem("panel_auth_token", "preview-token");
  localStorage.setItem(
    "panel_auth_user",
    JSON.stringify({ username: "nailsAdmin", role: "ADMIN", tokenType: "Bearer" })
  );
});

await page.route("**/api/**", async (route) => {
  const url = route.request().url();
  if (url.includes("/auth/")) {
    await route.continue();
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([]),
  });
});

await page.goto("http://localhost:5173/#citas", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

console.log("BODY:", (await page.locator("body").innerText()).slice(0, 400));

const aside = page.locator("aside");
if (await aside.count()) {
  await aside.screenshot({ path: path.join(out, "sidebar-logo-closeup.png") });
  await page.screenshot({ path: path.join(out, "sidebar-logo-full.png") });
  console.log("Saved sidebar screenshots");
} else {
  await page.screenshot({ path: path.join(out, "debug-no-sidebar.png"), fullPage: true });
  console.log("No sidebar");
}

await browser.close();
