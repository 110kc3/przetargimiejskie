# Changelog

All user-visible changes to the Chrome extension. The number shown in the
popup footer matches the latest entry here. Versioning per CLAUDE.md (semver:
MAJOR = breaking, MINOR = new feature/permission/host, PATCH = fixes/copy).

## v1.1.0 — 2026-05-27

- Katowice support in the in-context overlay. The content script now decorates
  the city BIP's auction board (`bip.katowice.eu/ogloszenia/tablicaogloszen/…`)
  with prior-history badges, and injects the timeline sidebar on individual
  `dokument.aspx?idr=…` pages. New host permission and content-script match
  for `https://bip.katowice.eu/*`.
- Introduced a per-site DOM adapter registry under `extension/sites/`. The
  content script is now generic — it picks an adapter by `location.hostname`,
  and each city ships its own selectors / URL regexes / inject target. Adding
  another city is now a single new file in `sites/` + one host in the manifest.
- Fixed a latent join bug where the content script looked up unnamespaced
  property keys against a city-namespaced map (no Gliwice card got a real
  history badge after the Wave 0 merge). Lookups now namespace via the
  adapter's `city`, matching what `background.js` stores.
- Branding cleanup: the extension name, short name, action title, popup tab
  title, archive tab title, notification title (PL + EN), and the PL/EN
  `popup.title` / `notif.title` / `archive.title` i18n strings no longer
  claim to be ZGM-Gliwice-only — they read "przetargimiejskie" instead. The
  popup's GitHub footer link now points at the actual data repo
  (`110kc3/przetargimiejskie`). Popup footer also shows the version string.
