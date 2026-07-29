import { chromium } from "playwright";
import path from "path";
import fs from "fs";

const out = path.resolve("tmp-screenshots");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();

async function mockApis(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("appointments") && url.includes("date")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ appointments: [], summary: null }),
      });
      return;
    }
    if (url.includes("specialist") || url.includes("doctor")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, name: "Ana López", specialty: "Uñas acrílicas", activeFlag: "Y" },
          { id: 2, name: "María Ruiz", specialty: "Nail art", activeFlag: "Y" },
        ]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

// 1) Login desktop
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, "show-login-desktop.png"), fullPage: true });
  await page.close();
}

// 2) Login mobile
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(out, "show-login-mobile.png"), fullPage: true });
  await page.close();
}

// 3) App citas + sidebar
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem("panel_auth_token", "preview-token");
    localStorage.setItem(
      "panel_auth_user",
      JSON.stringify({ username: "nailsAdmin", role: "ADMIN", tokenType: "Bearer" })
    );
  });
  await mockApis(page);
  await page.goto("http://localhost:5173/#citas", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, "show-citas-desktop.png") });
  await page.getByLabel("Navegación principal").screenshot({
    path: path.join(out, "show-sidebar.png"),
  });
  await page.close();
}

// 4) Especialistas
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem("panel_auth_token", "preview-token");
    localStorage.setItem(
      "panel_auth_user",
      JSON.stringify({ username: "nailsAdmin", role: "ADMIN", tokenType: "Bearer" })
    );
  });
  await mockApis(page);
  await page.goto("http://localhost:5173/#doctores", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, "show-doctores-desktop.png") });
  await page.close();
}

// 5) Mobile app with menu open
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    localStorage.setItem("panel_auth_token", "preview-token");
    localStorage.setItem(
      "panel_auth_user",
      JSON.stringify({ username: "nailsAdmin", role: "ADMIN", tokenType: "Bearer" })
    );
  });
  await mockApis(page);
  await page.goto("http://localhost:5173/#citas", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, "show-citas-mobile.png") });
  await page.getByLabel("Abrir menú").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, "show-menu-mobile.png") });
  await page.close();
}

console.log("Screenshots ready in", out);
await browser.close();
