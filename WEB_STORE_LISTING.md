# Chrome Web Store — listing copy

Paste-ready copy for the Chrome Web Store developer dashboard. **Polish is the
primary listing**; English is a secondary locale.

> **Coverage, stated honestly.** The **extension** covers the nine Śląskie cities
> in `extension/background.js` → `CITIES`: Gliwice, Katowice, Bytom, Zabrze,
> Sosnowiec, Rybnik, Bielsko-Biała, Mysłowice, Świętochłowice. The **website**
> przetargimiejskie.pl covers far more. Do not let this copy claim national
> coverage while `CITIES` holds nine — the store listing would be false. When the
> CITIES rework lands, this file and `manifest.json`'s `description` change with
> it, in the same commit.

> **Positioning (GTM §8.3).** Lead with **outcomes**, never with city counts.
> ListaPrzetargow has 7 000+ live listings to our 255 and wins any coverage
> comparison outright; what nobody else has is what *happened* — which auctions
> failed, in which round, and how far the price fell. Every headline below is
> built on that sentence: *"zanim zalicytujesz, sprawdź, czy ten lokal już się
> nie sprzedał i o ile spadła cena."*

---

## Store name (≤ 45 characters)

```
Przetargi miejskie
```

English locale:
```
Przetargi miejskie – municipal flat auctions
```

---

## Summary (≤ 132 characters — shown in search results)

**Polish (116):**
```
Zanim zalicytujesz, sprawdź czy ten lokal już dwa razy się nie sprzedał i o ile spadła cena. 9 miast woj. śląskiego.
```

**English (114):**
```
Check whether a municipal flat already failed to sell and how far its price has fallen. 9 cities in Silesia, free.
```

---

## `manifest.json` → `description` (≤ 132 characters)

This is the string that actually renders under the extension name in the store,
so it must match the summary's positioning. Keep the two in sync.

**Current shipped value (123):**
```
Zanim zalicytujesz: sprawdź, czy ten lokal już się nie sprzedał i o ile spadła cena. Historia rund i zł/m², 9 miast Śląska.
```

---

## Category

`Shopping` (alt: `Productivity`). Language: Polish (primary).

---

## Detailed description

### Polish

```
W naszych danych ponad połowa miejskich przetargów na mieszkania kończy się bez
nabywcy — a po nieudanej licytacji urząd może obniżyć cenę wywoławczą nawet do
50% wartości (a w rokowaniach do 40%). Przetargi miejskie pokazuje Ci to wprost,
na stronach BIP, z których i tak korzystasz.

Gdy przeglądasz ogłoszenie o przetargu, rozszerzenie dodaje obok niego:
• runda przetargu (1., 2., 3. …) — od razu widzisz, czy to ponowne wystawienie,
• czy ten lokal był już wystawiany i jak zakończyły się poprzednie licytacje,
• o ile spadła cena wywoławcza od pierwszej rundy,
• cena wywoławcza, powierzchnia i zł/m²,
• data przetargu, termin wpłaty wadium i oględzin.

DLACZEGO RUNDA MA ZNACZENIE
Zgodnie z ustawą o gospodarce nieruchomościami nieudany pierwszy przetarg
pozwala obniżyć cenę w drugim. "To trzecia runda" to nie ciekawostka — to
konkretna informacja o tym, ile jeszcze może spaść cena.

OBSŁUGIWANE MIASTA (rozszerzenie)
Gliwice (ZGM), Katowice, Bytom, Zabrze, Sosnowiec, Rybnik (ZGM),
Bielsko-Biała, Mysłowice, Świętochłowice.
Kolejne miasta są dodawane. Dane z ponad 50 miast w całej Polsce znajdziesz
na przetargimiejskie.pl.

ARCHIWUM
Wbudowane archiwum to przeszukiwalna, sortowalna tabela wszystkich
dotychczasowych przetargów — z filtrami województwa, miasta, typu i rocznika
oraz wyszukiwarką po ulicy. Obejmuje także domy i działki, z linkami do
geoportalu. Dla części miast dostępne są ceny osiągnięte w przetargach;
dla pozostałych — ceny wywoławcze i pełna historia rund.

OBSERWOWANE NIERUCHOMOŚCI
Dodaj lokal do obserwowanych, a rozszerzenie powiadomi Cię, gdy zostanie
wystawiony ponownie albo gdy zbliża się termin wadium.

PRYWATNOŚĆ
Nic nie opuszcza Twojego komputera. Rozszerzenie pobiera publiczne dane (pliki
JSON) z naszego repozytorium i czyta tylko strony BIP, które i tak otwierasz.
Bez kont, bez śledzenia, bez reklam, bez analityki.

Dane pochodzą z publicznych Biuletynów Informacji Publicznej (BIP) urzędów miast
i miejskich zakładów gospodarki mieszkaniowej. To narzędzie nieoficjalne,
niezwiązane z żadnym urzędem.
```

### English

```
In our data, more than half of municipal flat auctions end without a buyer — and
after a failed auction the authority may cut the starting price to as little as
50% of valuation (40% in negotiations). Przetargi miejskie shows you this
directly, on the public BIP pages you already browse.

When you view an auction announcement, the extension adds:
• the auction round (1st, 2nd, 3rd …) — instantly see if it's a re-listing,
• whether this flat was offered before, and how those auctions ended,
• how far the starting price has fallen since round one,
• starting price, area and PLN/m²,
• auction date, deposit (wadium) deadline and viewing dates.

WHY THE ROUND MATTERS
Under Polish property law a failed first auction lets the authority reduce the
price in the second. "This is round three" isn't trivia — it's a concrete signal
of how much further the price can fall.

CITIES (extension)
Gliwice (ZGM), Katowice, Bytom, Zabrze, Sosnowiec, Rybnik (ZGM),
Bielsko-Biała, Mysłowice, Świętochłowice. More are added. Data for 50+ cities
across Poland is on przetargimiejskie.pl.

ARCHIVE
A built-in, searchable, sortable archive of every past auction — with
voivodeship, city, type and year filters plus street search. Houses and land
plots included, with geoportal links. Some cities also carry achieved sale
prices; the rest show starting prices and full round history.

WATCHLIST
Star a property and the extension notifies you when it is listed again, or when
a deposit deadline approaches.

PRIVACY
Nothing leaves your computer. The extension fetches public JSON data from our
repository and only reads the BIP pages you already open. No accounts, no
tracking, no ads, no analytics.

Data comes from public municipal BIP bulletins and city housing authorities.
This is an unofficial tool, not affiliated with any city office.
```

---

## Permission justifications (dashboard "Privacy practices" tab)

| Item | Justification |
|---|---|
| **Host permissions** (`zgm-gliwice.pl`, `bip.katowice.eu`, `www.bytom.pl`, `i-biip.um.bytom.pl`) | The content script runs only on these municipal auction pages to add the history badge/chip next to each listing. |
| **`raw.githubusercontent.com`** | Fetches the public auction data files (`properties.json`, `active.json`). No user data is sent. This is the only host the extension itself requests. |
| **`storage`** | Caches the fetched data locally and stores the user's watch-list, language, theme and history-year preference. |
| **`alarms`** | Re-checks the public data roughly every 4 hours so a watched property can be flagged promptly. |
| **`notifications`** | Optional alert when a watched property is listed again or a deposit deadline nears. |
| **Remote code** | None. No remote code is executed; only static JSON data is fetched. |
| **Single purpose** | Show municipal property-auction history and outcomes on the relevant BIP pages and in a built-in archive. |

---

## Privacy policy URL

```
https://przetargimiejskie.pl/privacy
```

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
