import Tesseract from "tesseract.js";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";

const TEMP_DIR = "uploads/ocr-temp";

fs.ensureDirSync(TEMP_DIR);

export async function extractTextFromImage(filePath, mimetype, originalName) {
  let text = "";
  let confidence = 0;

  // ---------------------------
  // IMAGE FILE OCR
  // ---------------------------
  if (mimetype.startsWith("image/")) {
    const result = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m.status),
    });

    text = result.data.text;
    confidence = result.data.confidence;
  }

  // ---------------------------
  // PDF FILE OCR
  // ---------------------------
  else if (
    mimetype === "application/pdf" ||
    originalName.toLowerCase().endsWith(".pdf")
  ) {
    const outputPrefix = path.join(
      TEMP_DIR,
      path.basename(filePath, path.extname(filePath))
    );

    // Convert PDF → images
    await new Promise((resolve, reject) => {
      exec(
        `pdftoppm -png "${filePath}" "${outputPrefix}"`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    const imageFiles = fs
      .readdirSync(TEMP_DIR)
      .filter((f) => f.startsWith(path.basename(outputPrefix)));

    let fullText = "";
    let confidenceSum = 0;

    for (const img of imageFiles) {
      const imgPath = path.join(TEMP_DIR, img);
      const result = await Tesseract.recognize(imgPath, "eng");

      fullText += "\n" + result.data.text;
      confidenceSum += result.data.confidence;

      fs.unlinkSync(imgPath);
    }

    text = fullText;
    confidence = imageFiles.length
      ? confidenceSum / imageFiles.length
      : 0;
  }

  // ---------------------------
  // UNSUPPORTED FILE
  // ---------------------------
  else {
    throw new Error("Unsupported file type for OCR");
  }

  return { text, confidence };
}
