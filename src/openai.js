const { removeMarkdown } = require("./htmlParser");
const fsp = require("fs").promises;
const path = require("path");

const OpenAI = require("openai");
const { openaiApiKey } = require("./config");

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

async function analyzeHTML(extractedInfo, dataTestIds) {
  // Update function signature
  const prompt = `
    You are a highly experienced Senior QA Engineer. Given the extracted HTML information and a list of data-testid attributes, your task is to create a detailed step-by-step test plan for this webpage. Group the test steps into separate test cases based on functionality.

    Extracted HTML Information:
    \`\`\`json
    ${extractedInfo}
    \`\`\`

    data-testid Attributes:
    \`\`\`json
    ${JSON.stringify(dataTestIds, null, 2)}
    \`\`\`

    Return the test plan in the following format:

    \`\`\`
    Test Case: [Test Case Title]
    1. [Action] on element with data-testid="[data-testid]" (Input: "[input_value]")
    2. [Action] on element with data-testid="[data-testid]" (Expected Outcome: "[expected_outcome]")
    ...
    \`\`\`
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const analysisResult = completion.choices[0].message.content;

    // Pisahkan berdasarkan "Test Case:" untuk mendapatkan semua test case
    const testCases = analysisResult.split("Test Case:").slice(1);

    // Gabungkan kembali test cases menjadi satu string testSteps
    const testSteps = testCases.join("Test Case:").trim();

    return { testSteps };
  } catch (error) {
    console.error("Error during OpenAI analysis:", error);
    return {
      testSteps: "",
    };
  }
}

async function generateTestScript(testSteps, url) {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const prompt = `
    Generate a Playwright test script based on the following test steps. **Each Test Case should be a separate Playwright test function.**  Use \`getByTestId\` to select elements. Provide specific assertions for each Expected Outcome. Ensure the URL is navigated to at the start of each test.

    \`\`\`
    ${testSteps}
    \`\`\`

    Here's an example of how to translate a test step into Playwright code:

    Test Step:  Click on the "Submit" button with data-testid="button-submit" (Expected Outcome: User is redirected to /dashboard)

    Playwright Code:
    \`\`\`javascript
    test('Submit Button Redirect', async ({ page }) => {
        await page.goto('${url}');
        await page.getByTestId('button-submit').click();
        await expect(page).toHaveURL('/dashboard');
    });
    \`\`\`

    Return only the Playwright test script. Do not include any explanatory text and without code block markdown.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const testScript = completion.choices[0].message.content;

    const plainText = removeMarkdown(testScript);

    const testFileName = `${new URL(url).hostname.replace(/\./g, "_")}.spec.js`;

    const filePath = path.join("test", testFileName);
    await fsp.writeFile(filePath, plainText);
    console.log(`Test script generated at: ${filePath}`);
    return testScript;
  } catch (error) {
    console.error("Error generating test script:", error);
    return ""; // Return empty string on error
  }
}

module.exports = { analyzeHTML, generateTestScript };
