// Bytom result-document parser.
//
// Bytom is an active-catalog-only adapter (see crawl.js): crawlResultDocs()
// returns [], so the refresh loop never invokes parseResultDoc. This stub
// exists only to satisfy the registry contract (every city exposes
// parseResultDoc). If/when a results stream is wired up (the "Informacja o
// wyniku przetargu" pages, or .doc announcement parsing), the real parser lands
// here and produces the same sold-record shape build-properties expects.
//
// @param {string} _text  document text (unused — no result docs today)
// @param {string|null} _date
// @param {string} _url
// @returns {Array} always [] until a results stream exists
export function parseResultDoc(_text, _date, _url) {
  return [];
}
