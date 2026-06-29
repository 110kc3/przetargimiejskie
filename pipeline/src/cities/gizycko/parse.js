// Giżycko parsers.
//
// parseResultDoc: contract entry-point — always returns [] because Giżycko
// result PDFs are scanned images (Xerox WorkCentre 7225, confirmed 2026-06-29).
// pdftotext -layout extracts no text from them. When OCR support is added,
// this function will need to be updated.
//
// All active-listing parsing (address, area, price, auction date) is done at
// crawl time via the HTML body (see crawl.js: bodyTextFromDetail and helpers).
// No PDF parsing is required or possible for Giżycko's result stream.

/**
 * Parse one result document (PDF text or HTML text) into result records.
 *
 * GIŻYCKO SPECIFIC: result documents are scanned image PDFs produced by
 * Xerox WorkCentre 7225. pdftotext always returns empty text. This function
 * always returns [] — it exists only to satisfy the adapter contract so that
 * the pipeline can call it without special-casing this city.
 *
 * When OCR support is added (tesseract integration), this function should
 * be updated to parse the OCR text output.
 *
 * @param {string} _text     pdftotext output (always empty for this city)
 * @param {string|null} _fallbackDate  publication date from detail page (ISO)
 * @param {string} _sourceUrl  original PDF or page URL
 * @returns {[]}  always empty — scanned PDFs cannot be parsed
 */
export function parseResultDoc(_text, _fallbackDate, _sourceUrl) {
  // Result PDFs are scanned images — no text extractable by pdftotext.
  // Return [] to signal "no parsed result" without crashing the pipeline.
  return [];
}
