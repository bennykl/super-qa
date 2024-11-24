const fs = require("fs").promises;

async function saveDataTestIds(
  dataTestIds,
  filePath = "generated/test_results.json"
) {
  try {
    const existingData = await fs.readFile(filePath, "utf-8").catch(() => "[]");
    const existingIds = JSON.parse(existingData);
    const updatedData = { ...existingIds, ...dataTestIds };

    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
    console.log("Data-test IDs saved to", filePath);
  } catch (error) {
    console.error("Error saving data-test IDs:", error);
  }
}

module.exports = { saveDataTestIds };
