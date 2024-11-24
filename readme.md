# Super QA Automation Agent

## Overview

The Super QA Automation Agent is a comprehensive tool designed to automate the QA process for web applications. It leverages Playwright for browser automation and OpenAI for intelligent analysis to generate test IDs, create test scripts, and provide detailed test plans.

## Features

- **Browser Automation:** Uses Playwright to initialize a headless browser and navigate to specified URLs.
- **HTML Analysis:** Extracts existing `data-testid` attributes and generates new ones for elements without them.
- **OpenAI Integration:** Sends HTML structure and test IDs to OpenAI for detailed test plan generation.
- **Test Script Generation:** Creates Playwright test scripts based on the analysis and saves them to files.
- **Result Logging:** Logs results and saves generated test IDs to a JSON file.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/bennykl/super-qa.git
   cd super-qa
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your OpenAI API key by creating a `.env` file based on `.env.example`.

## Usage

Run the main script to start the QA automation process:

```bash
node index.js
```

## Configuration

- **OpenAI API Key:** Set your OpenAI API key in the `.env` file.
- **URL:** Modify the URL in `index.js` to specify the target web page for analysis.

## Dependencies

- **Playwright:** For browser automation.
- **OpenAI:** For intelligent analysis.
- **Node-HTML-Parser:** For HTML parsing and modification.
- **Dotenv:** For managing environment variables.

## Contributing

Feel free to contribute by opening issues or submitting pull requests.

## License

This project is licensed under the ISC License.

---

For more details, refer to the source code and comments within the files.
