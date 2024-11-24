const { parse } = require("node-html-parser");
const fsp = require("fs").promises;
const path = require("path");

function extractDataTestIds(html) {
  const root = parse(html);
  const elementsWithDataTestId = root.querySelectorAll("[data-testid]");

  // Use a Set to automatically remove duplicates
  const uniqueDataTestIds = new Set(
    elementsWithDataTestId.map((element) => element.getAttribute("data-testid"))
  );

  // Convert the Set back to an array
  return Array.from(uniqueDataTestIds);
}

function generateDataTestIds(html) {
  const root = parse(html);

  const htmlFileName = "generated_html.txt";
  const outputDir = "generated";

  const htmlFilePath = path.join(outputDir, htmlFileName);

  try {
    // Menulis HTML asli ke file
    fsp.writeFile(htmlFilePath, html);
    console.log(`Generated HTML saved to: ${htmlFilePath}`);
  } catch (err) {
    console.error("Error writing HTML/root to file:", err);
  }

  // Gunakan querySelectorAll yang lebih umum untuk memilih elemen yang bisa diuji
  const testableElements = root.querySelectorAll(
    "button, a, input, select, textarea, img, form, [role]"
  );
  let generatedIds = [];

  testableElements.forEach((element) => {
    // Periksa apakah elemen sudah memiliki data-testid
    if (!element.hasAttribute("data-testid")) {
      let tagName = element.tagName.toLowerCase();
      let suggestedId = tagName;

      const textContent = element.textContent.trim();
      const nameAttribute = element.getAttribute("name");
      const idAttribute = element.getAttribute("id");
      const roleAttribute = element.getAttribute("role");

      if (textContent) {
        suggestedId += `-${textContent
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")}`;
      } else if (nameAttribute) {
        suggestedId += `-${nameAttribute}`;
      } else if (idAttribute) {
        suggestedId += `-${idAttribute}`;
      } else if (roleAttribute) {
        suggestedId += `-${roleAttribute}`;
      } else {
        const attributes = element.attributes;
        for (let key in attributes) {
          if (["type", "class"].includes(key)) {
            suggestedId += `-${attributes[key].toLowerCase()}`;
          }
        }
      }

      // Handle jika ID sudah ada
      let finalId = suggestedId;
      let counter = 1;
      while (generatedIds.includes(finalId)) {
        finalId = `${suggestedId}-${counter}`;
        counter++;
      }

      element.setAttribute("data-testid", finalId);
      generatedIds.push(finalId);
    }
  });

  return { generatedIds, modifiedHtml: root.toString() };
}

function removeMarkdown(markdownText) {
  // Hapus backticks dan kode di dalamnya
  let textWithoutCodeBlocks = markdownText.replace(/`(.*?)`/g, "");

  // Hapus emphasis (*, **)
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(
    /(\*\*|__)(.*?)\1/g,
    "$2"
  );
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/(\*|_)(.*?)\1/g, "$2");

  // Hapus header (#)
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/#+\s(.*)/g, "$1");

  // Hapus blockquotes (>)
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(/^>\s(.*)/gm, "$1");

  // Hapus horizontal rules (---, ***)
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(
    /^\s*(\*\s*){3,}$/gm,
    ""
  );
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(
    /^\s*(\-\s*){3,}$/gm,
    ""
  );

  // Hapus tautan ([...](...))
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(
    /\[(.*?)\]\((.*?)\)/g,
    "$1"
  );

  // Hapus gambar (![...](...))
  textWithoutCodeBlocks = textWithoutCodeBlocks.replace(
    /!\[(.*?)\]\((.*?)\)/g,
    ""
  );

  return textWithoutCodeBlocks.trim();
}

function cleanupHTML(html) {
  const root = parse(html);

  // Remove all style tags
  const styleTags = root.querySelectorAll("style");
  styleTags.forEach((tag) => tag.remove());

  // Remove all script tags
  const scriptTags = root.querySelectorAll("script");
  scriptTags.forEach((tag) => tag.remove());

  // Remove all comments
  root.childNodes.forEach((node) => {
    if (node.nodeType === 8) {
      // Node.COMMENT_NODE === 8
      node.remove();
    }
  });

  // Remove the head element
  const headElement = root.querySelector("head");
  if (headElement) {
    headElement.remove();
  }

  // Remove all svg elements
  const svgElements = root.querySelectorAll("svg");
  svgElements.forEach((element) => element.remove());

  // Remove all iframe elements
  const iframeElements = root.querySelectorAll("iframe");
  iframeElements.forEach((element) => element.remove());

  const result = root.toString();

  const htmlFileName = "generated_html_cleanup.txt";
  const outputDir = "generated";

  const htmlFilePath = path.join(outputDir, htmlFileName);

  try {
    // Write the cleaned HTML to a file
    fsp.writeFile(htmlFilePath, result);
    console.log(`Generated cleanup HTML saved to: ${htmlFilePath}`);
  } catch (err) {
    console.error("Error writing cleanup to file:", err);
  }

  return result;
}

function extractElementInfo(element) {
  const dataTestId = element.getAttribute("data-testid");
  if (dataTestId) {
    return {
      strategy: "data-testid",
      dataTestId: dataTestId,
      tag: element.tagName,
      text: element.text.trim(),
      type: element.getAttribute("type"),
      name: element.getAttribute("name"),
      value: element.getAttribute("value"),
      parentTag: element.parentNode ? element.parentNode.tagName : null,
    };
  } else {
    // Strategi fallback (bisa disesuaikan)
    if (element.tagName === "BUTTON" || element.tagName === "A") {
      return {
        strategy: "tag-text",
        tag: element.tagName,
        text: element.text.trim(),
        parentTag: element.parentNode ? element.parentNode.tagName : null,
      };
    } else if (element.tagName === "INPUT" && element.getAttribute("type")) {
      return {
        strategy: "input-type-name",
        tag: element.tagName,
        type: element.getAttribute("type"),
        name: element.getAttribute("name"),
        parentTag: element.parentNode ? element.parentNode.tagName : null,
      };
    } else {
      return {
        strategy: "tag-text",
        tag: element.tagName,
        text: element.text.trim().substring(0, 50), // Ambil sebagian text saja
        parentTag: element.parentNode ? element.parentNode.tagName : null,
      };
    }
  }
}

function extractRelevantInfo(
  html,
  dataTestIds,
  attributesToExtract = ["data-testid"]
) {
  const root = parse(html);
  const extractedInfoMap = new Map(); // Use Map to group data

  // Only extract elements with data-testid if attributesToExtract contains only "data-testid"
  if (
    attributesToExtract.length === 1 &&
    attributesToExtract[0] === "data-testid"
  ) {
    if (dataTestIds && dataTestIds.length > 0) {
      dataTestIds.forEach((dataTestId) => {
        const elements = root.querySelectorAll(`[data-testid="${dataTestId}"]`);
        if (elements.length > 0) {
          const firstElement = elements[0];
          const baseInfo = extractElementInfo(firstElement);
          let info = extractedInfoMap.get(dataTestId) || {
            ...baseInfo,
            count: 0,
            details: [],
          };

          const uniqueElements = new Set(); // Use Set to track unique elements

          elements.forEach((element) => {
            const elementAttributes = {
              text: element.text.trim(),
              type: element.getAttribute("type"),
              name: element.getAttribute("name"),
              value: element.getAttribute("value"),
              parentTag: element.parentNode ? element.parentNode.tagName : null,
            };
            const elementKey = JSON.stringify(elementAttributes);
            if (!uniqueElements.has(elementKey)) {
              uniqueElements.add(elementKey);
              info.details.push(elementAttributes);
            }
          });

          info.count = uniqueElements.size; // Set count to the size of the unique elements Set
          extractedInfoMap.set(dataTestId, info);
        }
      });
    }
  } else {
    // If attributesToExtract contains more than just "data-testid", extract all elements
    const allElements = root.querySelectorAll("*");
    allElements.forEach((element) => {
      const elementInfo = extractElementInfo(element);
      let key;
      if (elementInfo.strategy === "data-testid") {
        key = elementInfo.dataTestId;
      } else if (elementInfo.strategy === "tag-text") {
        key = `${elementInfo.tag}-${elementInfo.text}`;
      } else if (elementInfo.strategy === "input-type-name") {
        key = `${elementInfo.tag}-${elementInfo.type}-${elementInfo.name}`;
      } else {
        key = `${elementInfo.tag}-${elementInfo.text.substring(0, 50)}`; // Unique enough?
      }

      let info = extractedInfoMap.get(key) || {
        ...elementInfo,
        count: 0,
        details: [],
      };

      const elementAttributes = {
        text: element.text.trim(),
        type: element.getAttribute("type"),
        name: element.getAttribute("name"),
        value: element.getAttribute("value"),
        parentTag: element.parentNode ? element.parentNode.tagName : null,
      };
      const elementKey = JSON.stringify(elementAttributes);
      if (
        !info.details.some((detail) => JSON.stringify(detail) === elementKey)
      ) {
        info.count += 1;
        info.details.push(elementAttributes);
      }
      extractedInfoMap.set(key, info);
    });
  }

  const extractedInfo = Array.from(extractedInfoMap.values());

  const htmlFileName = "generated_tag_relevant.json";
  const outputDir = "generated";
  const htmlFilePath = path.join(outputDir, htmlFileName);

  try {
    const jsonData = JSON.stringify(extractedInfo, null, 2);
    fsp.writeFile(htmlFilePath, jsonData);
    console.log(`Generated relevant info saved to: ${htmlFilePath}`);
  } catch (err) {
    console.error("Error writing relevant info to file:", err);
  }

  return extractedInfo;
}

module.exports = {
  extractDataTestIds,
  generateDataTestIds,
  cleanupHTML,
  removeMarkdown,
  extractRelevantInfo,
};
