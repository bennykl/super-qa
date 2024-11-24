const { parse } = require("node-html-parser");
const fsp = require("fs").promises;
const path = require("path");

function extractDataTestIds(html) {
  const root = parse(html);
  const elementsWithDataTestId = root.querySelectorAll("[data-testid]");
  return elementsWithDataTestId.map((element) =>
    element.getAttribute("data-testid")
  );
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

  // Hapus semua tag style
  const styleTags = root.querySelectorAll("style");
  styleTags.forEach((tag) => tag.remove());

  // Hapus semua tag script
  const scriptTags = root.querySelectorAll("script");
  scriptTags.forEach((tag) => tag.remove());

  // Hapus semua komentar
  root.childNodes.forEach((node) => {
    if (node.nodeType === 8) {
      // Node.COMMENT_NODE === 8
      node.remove();
    }
  });

  const result = root.toString();

  const htmlFileName = "generated_html_cleanup.txt";
  const outputDir = "generated";

  const htmlFilePath = path.join(outputDir, htmlFileName);

  try {
    // Menulis HTML asli ke file
    fsp.writeFile(htmlFilePath, result);
    console.log(`Generated cleanup HTML saved to: ${htmlFilePath}`);
  } catch (err) {
    console.error("Error writing cleanup to file:", err);
  }

  return result;
}

module.exports = {
  extractDataTestIds,
  generateDataTestIds,
  cleanupHTML,
  removeMarkdown,
};
