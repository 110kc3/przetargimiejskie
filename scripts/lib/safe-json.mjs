// JSON embedded in an HTML <script> element must not contain a literal "<".
// JSON.stringify alone permits </script>, which lets source-controlled strings
// terminate an application/ld+json block and inject markup.
export function stringifyJsonForHtml(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}
