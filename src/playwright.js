const { chromium } = require("playwright");

async function openPage(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" }); // Tunggu sampai network idle
  return { page, browser };
}

async function getHTML(page) {
  return await page.content();
}

async function takeScreenshot(page, path) {
  await page.screenshot({ path: path, fullPage: true });
}

async function closeBrowser(browser) {
  await browser.close();
}

module.exports = { openPage, getHTML, takeScreenshot, closeBrowser };
