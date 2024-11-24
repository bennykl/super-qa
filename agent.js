const {
  openPage,
  getHTML,
  takeScreenshot,
  closeBrowser,
} = require("./playwright");
const {
  extractDataTestIds,
  generateDataTestIds,
  cleanupHTML,
} = require("./htmlParser");
const { analyzeHTML, generateTestScript } = require("./openai");
const { saveDataTestIds } = require("./utils");
const path = require("path");
const fs = require("fs");
const fsp = require("fs").promises;

async function runAgent(url) {
  console.log("Memulai Agent AI untuk QA...");
  try {
    // Step 1 & 2: Buka halaman dan dapatkan HTML
    console.log(`Membuka halaman: ${url}`);
    const { page, browser } = await openPage(url);
    let html = await getHTML(page);

    // Ambil screenshot
    console.log("Mengambil screenshot...");
    const screenshotPath = path.join(
      "generated",
      `${new URL(url).hostname}.png`
    );
    await takeScreenshot(page, screenshotPath);
    console.log(`Screenshot disimpan di: ${screenshotPath}`);

    // Step 3 & 4: Ekstrak data-testid
    console.log("Mengekstrak data-testid...");
    let existingDataTestIds = extractDataTestIds(html);

    // Step 5: Generate data-testid jika tidak ada
    console.log("Membuat data-testid jika tidak ada...");
    const { generatedIds, modifiedHtml } = generateDataTestIds(html);
    if (generatedIds.length > 0) {
      html = modifiedHtml;
    }
    const allDataTestIds = existingDataTestIds.concat(generatedIds);

    // Clean up HTML sebelum dikirim ke OpenAI
    console.log("Membersihkan HTML...");
    const cleanedHtml = cleanupHTML(html);

    // Step 6: Analisis HTML dan data-testid dengan OpenAI
    console.log("Menganalisis HTML dengan OpenAI...");
    const { testSteps, generalAnalysis } = await analyzeHTML(
      cleanedHtml,
      allDataTestIds
    );

    // Step 7: Generate test script
    console.log("Generating test script...");
    await generateTestScript(testSteps, url);

    // Step 8: Berikan hasil dan laporan analisis
    console.log("\nHasil data-testid:");
    console.log(allDataTestIds);
    await saveDataTestIds({ [url]: allDataTestIds });

    console.log("\nLangkah Pengujian:");
    console.log(testSteps);

    // Tutup browser
    await closeBrowser(browser);
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  }
}

// Buat folder 'generated' jika belum ada
const dataDir = path.join("generated");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Buat folder 'test' jika belum ada
const testDir = path.join("test");
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

runAgent("http://localhost:5173");
