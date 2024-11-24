const {
  openPage,
  getHTML,
  takeScreenshot,
  closeBrowser,
} = require("./playwright");
const {
  extractDataTestIds,
  cleanupHTML,
  extractRelevantInfo,
} = require("./htmlParser");
const { analyzeHTML, generateTestScript } = require("./openai");
const { saveDataTestIds } = require("./utils");
const path = require("path");
const fs = require("fs");

async function runAgent(url) {
  console.log("Starting AI Agent for QA...");
  try {
    // Step 1 & 2: Open the page and get the HTML
    console.log(`Opening page: ${url}`);
    const { page, browser } = await openPage(url);
    const html = await getHTML(page);

    // Take a screenshot
    console.log("Taking screenshot...");
    const screenshotPath = path.join(
      "generated",
      `${new URL(url).hostname}.png`
    );
    await takeScreenshot(page, screenshotPath);
    console.log(`Screenshot saved to: ${screenshotPath}`);

    // Step 3: Cleanup HTML
    console.log("Cleaning up HTML...");
    const cleanedHtml = cleanupHTML(html);

    // Step 4 & 5: Extract and/or generate data-testid
    console.log("Extracting existing data-testid attributes...");
    let existingDataTestIds = extractDataTestIds(html);

    // Step 6: Extract relevant info from HTML
    console.log("Extracting relevant information from the HTML...");
    const extractedInfo = extractRelevantInfo(cleanedHtml, existingDataTestIds);

    // Step 7: Analyze HTML and data-testid with OpenAI
    console.log("Analyzing HTML with OpenAI...");
    // Passing extractedInfo to analyzeHTML
    const { testSteps } = await analyzeHTML(
      JSON.stringify(extractedInfo, null, 2),
      existingDataTestIds
    );

    if (existingDataTestIds.length) {
      // Step 8: Generate test script
      console.log("Generating test script...");
      await generateTestScript(testSteps, url);
    } else {
      console.log("Can not generate test, because data-testid empty...");
    }

    // Step 9: Provide results and analysis report
    console.log("\ndata-testid Results:");
    console.log(existingDataTestIds);
    await saveDataTestIds({ [url]: existingDataTestIds });

    console.log("\nTest Steps:");
    console.log(testSteps);

    // Close browser
    await closeBrowser(browser);
  } catch (error) {
    console.error("An error occurred:", error);
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

module.exports = {
  runAgent,
};
