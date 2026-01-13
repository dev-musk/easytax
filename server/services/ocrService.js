import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";
import os from "os";
import pdf from "pdf-poppler";

export async function extractTextFromImage(filePath, mimeType, originalName)
 {
  let tempDir = null;
  let imagePathsToProcess = []; // ✅ FIX


  try {
    console.log("🔍 Starting OCR extraction...");
    console.log("📂 File:", filePath);

   const isPDF =
  mimeType === "application/pdf" ||
  originalName?.toLowerCase().endsWith(".pdf");

if (isPDF) {
  console.log("📄 PDF detected via mimetype/originalname");


      // Create unique temp directory for this conversion
      tempDir = path.join(
        os.tmpdir(),
        `pdf_ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );

      try {
        imagePathsToProcess = [filePath];

        console.log(
          `✅ PDF converted to ${imagePathsToProcess.length} image(s)`
        );
        console.log(`📸 Images created:`, imagePathsToProcess);
      } catch (pdfError) {
        console.error("❌ PDF conversion failed:", pdfError.message);
        throw new Error(`PDF conversion failed: ${pdfError.message}`);
      }
    } else {
      // Single image file
      if (!fs.existsSync(filePath)) {
        throw new Error(`Image file not found: ${filePath}`);
      }
      imagePathsToProcess = [filePath];
      console.log("📷 Image file detected:", filePath);
    }

    // Validate that we have images to process
    if (!imagePathsToProcess || imagePathsToProcess.length === 0) {
      throw new Error("No images to process");
    }

    // Verify all image paths exist
    const validPaths = imagePathsToProcess.filter((p) => {
      const exists = fs.existsSync(p);
      if (!exists) console.warn(`⚠️ Image path does not exist: ${p}`);
      return exists;
    });

    if (validPaths.length === 0) {
      throw new Error("None of the converted images exist");
    }

    console.log(
      `✅ Validated ${validPaths.length} image(s) for OCR processing`
    );

    // Process all images and extract text
    let fullText = "";
    let totalConfidence = 0;

    for (let i = 0; i < validPaths.length; i++) {
      const imagePath = validPaths[i];
      console.log(`🔄 Processing image ${i + 1}/${validPaths.length}...`);
      console.log(`   File: ${imagePath}`);
      console.log(`   Size: ${fs.statSync(imagePath).size} bytes`);

      try {
        const {
          data: { text, confidence },
        } = await Tesseract.recognize(imagePath, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              console.log(`   OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          },
        });

        fullText += text + "\n\n";
        totalConfidence += confidence;

        console.log(`✅ Image ${i + 1} OCR completed`);
        console.log(`   Confidence: ${Math.round(confidence * 100)}%`);
        console.log(`   Text length: ${text.length} characters`);
      } catch (ocrError) {
        console.error(`❌ OCR failed for image ${i + 1}:`, ocrError.message);
        throw new Error(
          `OCR processing failed on image ${i + 1}: ${ocrError.message}`
        );
      }
    }

    // Calculate average confidence
    const avgConfidence = Math.round(
      (totalConfidence / validPaths.length) * 100
    );
    console.log(`📊 Average confidence: ${avgConfidence}%`);
    console.log(
      `📄 Total extracted text length: ${fullText.length} characters`
    );

    if (fullText.trim().length === 0) {
      console.warn("⚠️ WARNING: No text was extracted from images");
    }

    const parsedData = parseIndianInvoice(fullText);

    return {
      rawText: fullText,
      confidence: avgConfidence,
      ...parsedData,
      success: true,
    };
  } catch (error) {
    console.error("❌ OCR Error:", error.message);
    console.error("Stack:", error.stack);
    throw new Error(`OCR processing failed: ${error.message}`);
  } finally {
    // ✅ CRITICAL FIX: Cleanup temp directory after processing
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        console.log("🗑️ Cleaning up temporary directory...");
        const files = fs.readdirSync(tempDir);
        console.log(`   Found ${files.length} file(s) to delete`);

        files.forEach((file) => {
          try {
            fs.unlinkSync(path.join(tempDir, file));
          } catch (e) {
            console.warn(`   Failed to delete: ${file}`);
          }
        });

        fs.rmdirSync(tempDir);
        console.log("✅ Temporary directory cleaned up");
      } catch (cleanupError) {
        console.error("⚠️ Cleanup error:", cleanupError.message);
      }
    }
  }
}

async function convertPdfToImages(pdfPath, outputDir) {
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const options = {
      format: "png",
      out_dir: outputDir,
      out_prefix: "page",
      page: null,
      dpi: 150,
    };

    console.log("🖼️ Converting PDF to images using pdf-poppler...");
    await pdf.convert(pdfPath, options);

    const files = fs
      .readdirSync(outputDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    if (!files.length) {
      throw new Error("PDF conversion produced no images");
    }

    const imagePaths = files.map((f) => path.join(outputDir, f));
    console.log(`✅ Converted ${imagePaths.length} page(s)`);

    return imagePaths;
  } catch (err) {
    throw new Error(`PDF to image conversion failed: ${err.message}`);
  }
}

function parseIndianInvoice(text) {
  console.log("🔍 Parsing Indian invoice patterns...");

  const patterns = {
    invoiceNumber:
      /(?:Invoice\s*#?|Bill\s*#?|Receipt\s*#?|No\.\s*)?[\s:]*([A-Z0-9\-\/]{6,}?)(?:\s|$|\n)/i,
    date: /(?:Invoice Date|Date|Dated)[\s:]*(\d{1,2}[\s\/\-\.]\w{3,9}[\s\/\-\.]\d{2,4})/i,
    totalAmount:
      /(?:Total Amount Due|Total|Grand Total|Net Total|Final Amount)[\s:]*(?:₹|Rs\.?|INR)?[\s]*([\d,]+\.?\d*)/i,
    gstin:
      /(?:GSTIN|GST No)[\s:]*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1})/i,
    hsn: /(?:HSN|SAC)[\s:\/]*([0-9]{4,8})/i,
    vendorName:
      /(?:Bill To|Billed To|To|Customer|From|Vendor)[\s:]*\n?\s*([A-Z][a-zA-Z\s&.,Ltd]+?)(?:\n|GSTIN|Address|Contact|$)/i,
    gstRate: /(?:CGST|SGST|IGST|GST)[\s@\(]*(\d{1,2})%/i,
    poNumber: /(?:PO|Purchase Order)[\s#:]*([A-Z0-9\-\/]+)/i,
    dueDate: /(?:Due Date)[\s:]*(\d{1,2}[\s\/\-\.]\w{3,9}[\s\/\-\.]\d{2,4})/i,
  };

  const extracted = {};
  let matchCount = 0;

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted[key] = match[1].trim();
      matchCount++;
      console.log(`✓ Found ${key}:`, extracted[key]);
    }
  }

  console.log(
    `📊 Extracted ${matchCount}/${Object.keys(patterns).length} fields`
  );

  // Parse amounts
  if (extracted.totalAmount) {
    const cleanAmount = extracted.totalAmount.replace(/[,\s]/g, "");
    extracted.totalAmount = parseFloat(cleanAmount);

    if (isNaN(extracted.totalAmount)) {
      console.warn("⚠️ Amount parsing failed");
      extracted.totalAmount = 0;
    }
  }

  // Parse dates
  if (extracted.date) {
    extracted.date = normalizeDate(extracted.date);
  }

  if (extracted.dueDate) {
    extracted.dueDate = normalizeDate(extracted.dueDate);
  }

  // Set default GST rate
  if (!extracted.gstRate) {
    extracted.gstRate = 18;
  } else {
    extracted.gstRate = parseInt(extracted.gstRate);
  }

  // Clean vendor name
  if (extracted.vendorName) {
    extracted.vendorName = extracted.vendorName.replace(/\s+/g, " ").trim();
  }

  // Extract line items
  extracted.items = extractLineItems(text);
  extracted.parsingConfidence =
    (matchCount / Object.keys(patterns).length) * 100;

  return extracted;
}

function normalizeDate(dateString) {
  try {
    const monthNames = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };

    const textDateMatch = dateString.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
    if (textDateMatch) {
      const [, day, monthName, year] = textDateMatch;
      const month = monthNames[monthName.toLowerCase()];
      if (month) {
        return `${year}-${month}-${day.padStart(2, "0")}`;
      }
    }

    const numericMatch = dateString.match(
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/
    );
    if (numericMatch) {
      const [, day, month, year] = numericMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const shortYearMatch = dateString.match(
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/
    );
    if (shortYearMatch) {
      let [, day, month, year] = shortYearMatch;
      year = "20" + year;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    console.warn("⚠️ Date format not recognized:", dateString);
    return new Date().toISOString().split("T")[0];
  } catch (error) {
    console.error("Date normalization error:", error);
    return new Date().toISOString().split("T")[0];
  }
}

function extractLineItems(text) {
  const items = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (
      !line ||
      line.match(/S\.No|Description|HSN|Qty|Rate|Amount|Total|Subtotal/i)
    ) {
      continue;
    }

    const itemMatch = line.match(
      /^(\d+)\s+(.+?)\s+(\d{4,8})\s+(\d+)\s+(\w+)\s+[₹¥Rs\.]*\s*([\d,]+\.?\d*)\s+[₹¥Rs\.]*\s*([\d,]+\.?\d*)/
    );

    if (itemMatch) {
      const [, sno, description, hsn, qty, unit, rate, amount] = itemMatch;

      items.push({
        sno: parseInt(sno),
        description: description.trim(),
        hsn: hsn,
        quantity: parseInt(qty),
        unit: unit,
        rate: parseFloat(rate.replace(/,/g, "")),
        amount: parseFloat(amount.replace(/,/g, "")),
      });
    }
  }

  console.log(`📦 Extracted ${items.length} line items`);
  return items;
}

export function validateGSTIN(gstin) {
  if (!gstin || gstin.length !== 15) return false;

  const gstinPattern =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}$/;
  return gstinPattern.test(gstin);
}

export default {
  extractTextFromImage,
  validateGSTIN,
};
