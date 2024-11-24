const playwright = require("playwright");
const { OpenAI } = require("openai");
const fs = require("fs").promises;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: "wkwkwk",
});

class QAAutomationAgent {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testIds = new Set();
    this.htmlStructure = "";
  }

  async initialize() {
    this.browser = await playwright.chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
  }

  async analyzePage(url) {
    // Step 1: Open page
    await this.page.goto(url);
    console.log("Page loaded successfully");

    // Step 2: Get HTML
    this.htmlStructure = await this.page.content();

    // Step 3 & 4: Analyze HTML structure and collect existing data-testids
    const existingTestIds = await this.page.evaluate(() => {
      const elements = document.querySelectorAll("[data-testid]");
      return Array.from(elements).map((el) => ({
        testId: el.getAttribute("data-testid"),
        tagName: el.tagName.toLowerCase(),
        type: el.getAttribute("type"),
        innerText: el.innerText.trim(),
      }));
    });

    // Step 5: Collect elements without data-testid and generate IDs
    const elementsWithoutTestId = await this.page.evaluate(() => {
      const selectors = "a, button, input, select, textarea, form";
      const elements = document.querySelectorAll(selectors);
      return Array.from(elements)
        .filter((el) => !el.hasAttribute("data-testid"))
        .map((el) => ({
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          innerText: el.innerText.trim(),
          id: el.id,
          name: el.name,
          className: el.className,
        }));
    });

    // Generate test IDs for elements without them
    const generatedTestIds = elementsWithoutTestId.map((el) => {
      let baseId = "";
      if (el.innerText) {
        baseId = el.innerText.toLowerCase().replace(/[^a-z0-9]/g, "-");
      } else if (el.name) {
        baseId = el.name.toLowerCase();
      } else if (el.id) {
        baseId = el.id.toLowerCase();
      } else {
        baseId = `${el.tagName}-${el.type || "element"}`;
      }
      return {
        suggestedTestId: `${baseId}-${el.tagName}`,
        originalElement: el,
      };
    });

    // Step 6: Analyze with OpenAI
    const analysis = await this.analyzeWithOpenAI(
      this.htmlStructure,
      existingTestIds,
      generatedTestIds
    );

    return {
      existingTestIds,
      generatedTestIds,
      analysis,
    };
  }

  async analyzeWithOpenAI(html, existingTestIds, generatedTestIds) {
    const prompt = `
      As a QA Engineer, analyze this HTML structure and test IDs.
      Existing test IDs: ${JSON.stringify(existingTestIds)}
      Generated test IDs: ${JSON.stringify(generatedTestIds)}

      Please provide:
      1. A test strategy for this page
      2. Suggested test scenarios
      3. Potential improvements for test coverage
      4. Any accessibility concerns
      5. Step by step test plan

      HTML Structure:
      ${html.substring(0, 1000)}... (truncated)
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert QA Engineer analyzing web pages for testing.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  }

  async generateTestScript() {
    const testScript = `
      import { test, expect } from '@playwright/test';

      test('Page test suite', async ({ page }) => {
        ${
          this.testIds.size > 0
            ? Array.from(this.testIds)
                .map(
                  (testId) => `
                // Test for element with data-testid="${testId}"
                await expect(page.getByTestId('${testId}')).toBeVisible();
              `
                )
                .join("\n")
            : "// No test IDs found"
        }
      });
    `;

    await fs.writeFile("generated-test.spec.js", testScript);
    return testScript;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Example usage
async function runAnalysis(url) {
  const agent = new QAAutomationAgent();
  try {
    await agent.initialize();
    const result = await agent.analyzePage(url);
    console.log("Analysis Results:", result);
    const testScript = await agent.generateTestScript();
    console.log("Generated Test Script:", testScript);
  } catch (error) {
    console.error("Error during analysis:", error);
  } finally {
    await agent.close();
  }
}

module.exports = { QAAutomationAgent, runAnalysis };
