// Chełm — Prezydent Miasta Chełm auctions municipal property directly on the
// city BIP at umchelm.bip.lubelskie.pl (lubelskie voivodeship BIP platform).
//
// Board: https://umchelm.bip.lubelskie.pl/index.php?id=55  (796 records 2013–2026)
// This is the "Ogłoszenia od 2013r." nieruchomości board — it covers BOTH
// przetarg sale announcements AND wykazy (pre-auction property lists). The
// najem/dzierżawa board (id=143) is explicitly out of scope.
//
// API discovery (2026-06-28):
//   The board page embeds a DataTables config with `"ajaxSource":"?id=55&action=list-ajax"`.
//   POST to that endpoint returns all records as JSON (iTotalRecords: 796).
//   Each record carries id_dokumentu, tresc (title), data_utworzenia (date).
//   PDF attachment URL is on the document detail page:
//     GET ?id=55&action=details&document_id=<id_dokumentu>
//     → HTML page with <a href="https://umchelm.bip.lubelskie.pl/upload/pliki/...pdf">
//
// Content format:
//   Announcements: text PDFs, standard "OGŁOSZENIE O PRZETARGU" header from
//     Prezydent Miasta Chełm. Price uses dot-thousands "278.350,00zł". Date
//     written as Polish long-form "20 lipca 2026r." or "20 lipca 2026 r."
//   Result notices: text PDFs, header "INFORMACJA" (not "INFORMACJA o wyniku …"
//     as in TG — just "INFORMACJA"), signed by Dyrektor Departamentu.
//     Achieved-price stream is WEAK: only 5 wynik records in 796; the adapter
//     returns them via crawlResultDocs but callers should not expect dense data.
//
// Closest analog: Tarnowskie Góry (single-property text PDFs, same parser shape).
// Document codes: DN.7140.* (najem), DN.6840.*/DN.6845.* (sprzedaż/dzierżawa).
// Spółdzielcze własnościowe prawo do lokalu items are included (classifyKind
// catches "lokalu mieszkaln" inside those titles/bodies).

export const config = {
  id: 'chelm',
  // TERYT for Chełm grodzki (miasto na prawach powiatu, powiat code 0603,
  // gmina-type 1). Provisional — confirm on first geoportal run.
  teryt: '060301_1',
  label: 'Chełm',
  voivodeship: 'lubelskie',
  authority: 'Urząd Miasta Chełm',
  host: 'umchelm.bip.lubelskie.pl',
  source: 'html',
};
