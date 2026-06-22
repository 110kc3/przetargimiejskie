# Chrome Web Store — listing copy

Paste-ready copy for the Chrome Web Store developer dashboard. **Polish is the
primary listing** (the audience is Silesian residents/investors); English is a
secondary locale. Covers all nine cities currently shipped: Gliwice, Katowice,
Bytom, Zabrze, Sosnowiec, Rybnik, Bielsko-Biała, Mysłowice, Świętochłowice.

---

## Store name (≤ 45 characters)

```
Przetargi miejskie
```

English locale:
```
Przetargi miejskie – Silesia property auctions
```

---

## Summary (≤ 132 characters — shown in search results)

**Polish (113):**
```
Historia miejskich przetargów na mieszkania w 9 miastach Śląska: rundy, ceny wywoławcze, zł/m², terminy, wadium.
```

**English (118):**
```
Municipal flat-auction history for Silesian cities: past rounds, starting prices, PLN/m², wadium & viewing dates.
```

---

## Category

`Shopping` (alt: `Productivity`). Language: Polish (primary).

---

## Detailed description

### Polish

```
Przetargi miejskie pokazuje historię miejskich przetargów na sprzedaż
lokali mieszkalnych w miastach Górnego Śląska, bezpośrednio na stronach BIP,
z których korzystasz.

Gdy przeglądasz ogłoszenie o przetargu, rozszerzenie dodaje obok niego komplet
informacji:
• runda przetargu (1., 2., 3. …) — od razu widzisz, czy to ponowne wystawienie,
• cena wywoławcza, powierzchnia i zł/m²,
• data przetargu,
• informacja, czy dana nieruchomość była już wcześniej wystawiana.

OBSŁUGIWANE MIASTA
Gliwice (ZGM), Katowice, Bytom, Zabrze, Sosnowiec, Rybnik (ZGM),
Bielsko-Biała, Mysłowice, Świętochłowice.
Kolejne miasta są dodawane.

ARCHIWUM
Wbudowane archiwum to przeszukiwalna, sortowalna tabela wszystkich
dotychczasowych przetargów — z filtrami miasta, typu, rocznika i wyszukiwarką
po ulicy. Dla Gliwic dostępne są również ceny osiągnięte w przetargach;
dla pozostałych miast — ceny wywoławcze i historia rund.

PRYWATNOŚĆ
Nic nie opuszcza Twojego komputera. Rozszerzenie pobiera publiczne dane (pliki
JSON) z naszego repozytorium i czyta tylko strony BIP, które i tak otwierasz.
Bez kont, bez śledzenia, bez reklam.

Dane pochodzą z publicznych Biuletynów Informacji Publicznej (BIP) urzędów miast
i miejskich zakładów gospodarki mieszkaniowej. To narzędzie nieoficjalne,
niezwiązane z żadnym urzędem.
```

### English

```
Przetargi miejskie surfaces the history of municipal flat-sale auctions
across Upper Silesian cities, right on the public BIP pages you already browse.

When you view an auction announcement, the extension adds a compact info chip
next to it:
• auction round (1st, 2nd, 3rd …) — instantly see if it's a re-listing,
• starting price, area and PLN/m²,
• auction date,
• whether the property has been offered before.

CITIES
Gliwice (ZGM), Katowice, Bytom, Zabrze, Sosnowiec, Rybnik (ZGM),
Bielsko-Biała, Mysłowice, Świętochłowice. More are added.

ARCHIVE
A built-in, searchable, sortable archive of every past auction — with city,
type, year filters and street search. Gliwice also has achieved sale prices;
other cities show starting prices and round history.

PRIVACY
Nothing leaves your computer. The extension fetches public JSON data from our
repository and only reads the BIP pages you already open. No accounts, no
tracking, no ads.

Data comes from public municipal BIP bulletins and city housing authorities.
This is an unofficial tool, not affiliated with any city office.
```

---

## Permission justifications (dashboard "Privacy practices" tab)

| Item | Justification |
|---|---|
| **Host permissions** (`zgm-gliwice.pl`, `bip.katowice.eu`, `www.bytom.pl`, `i-biip.um.bytom.pl`) | The content script runs only on these municipal auction pages to add the history badge/chip next to each listing. |
| **`raw.githubusercontent.com` / przetargimiejskie.pl** | Fetches the public auction data files (JSON). No user data is sent. |
| **`storage`** | Caches the fetched data locally (6h) and stores the user's watch-list + language/theme choice. |
| **`notifications`** | Optional alert when a watched property is listed again. |
| **Remote code** | None. No remote code is executed; only static JSON data is fetched. |
| **Single purpose** | Show municipal property-auction history on the relevant BIP pages and in a built-in archive. |

---

## Privacy policy URL

```
https://przetargimiejskie.pl/privacy
```
(Until the site is live, use the GitHub-hosted copy:
`https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md`.)

## Homepage URL

```
https://przetargimiejskie.pl
```

## Support / contact email

```
kontakt@przetargimiejskie.pl
```

## Screenshots

See `screenshots/chrome-store/` — five 1280×800 PNGs, regenerated from SVG via `make.js`:
`01-on-page-chip.png` (auction history + deal score injected on a BIP announcement),
`02-popup-all-cities.png` (popup: 9 cities, flats/houses/land, deal score, map links),
`03-web-archive.png` (searchable archive incl. houses & land),
`04-houses-land.png` (the Rodzaj filter — domy & działki with geoportal links),
`05-raporty.png` (Raporty: median zł/m² by city + price-drop deals board).
