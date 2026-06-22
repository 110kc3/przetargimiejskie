# Chrome Web Store — listing copy

Everything below is ready to paste into the Chrome Web Store developer
dashboard. Two languages are provided — use Polish as the primary listing
(the audience is Gliwice residents) and English as a secondary locale if you
add one.

---

## Store name

```
ZGM Gliwice — historia przetargów
```

(English locale: `ZGM Gliwice — auction history`)

---

## Summary  (max 132 characters — shown in search results)

**Polish:**
```
Historia przetargów nieruchomości ZGM Gliwice: dawne ceny, zł/m², terminy wadium i oględzin, powiadomienia.
```
(106 characters)

**English:**
```
Auction history for ZGM Gliwice municipal property listings: past prices, PLN/m², wadium & viewing dates, alerts.
```
(112 characters)

---

## Description  (full — Polish)

```
Rozszerzenie pokazuje pełną historię przetargów nieruchomości miejskich
prowadzonych przez Zakład Gospodarki Mieszkaniowej w Gliwicach
(zgm-gliwice.pl).

Gdy oglądasz aktualne ogłoszenie przetargu, od razu widzisz, czy dana
nieruchomość była już wcześniej wystawiana — ile razy, po jakiej cenie i z
jakim skutkiem. Nieruchomość, która nie sprzedała się kilka razy z rzędu, to
zwykle sygnał niskiego zainteresowania — i często okazja.

CO ROBI ROZSZERZENIE

• Na listach przetargów (lokale mieszkalne, użytkowe, garaże) dokleja do
  każdej oferty znacznik: „pierwsza aukcja" albo „poprzednio N× — M bez
  sprzedaży". Kolor podpowiada skalę: zielony = nowość, żółty = jedna
  nieudana próba, czerwony = dwie lub więcej.

• Pokazuje cenę za m² obok ceny wywoławczej — łatwiej porównać oferty.

• Pokazuje termin wpłaty wadium i termin oględzin lokalu wprost na liście.

• Po najechaniu na znacznik rozwija się tabela ze wszystkimi wcześniejszymi
  podejściami: data, cena wywoławcza, zł/m², wynik, powód braku sprzedaży.

• Na stronie pojedynczej nieruchomości dokleja panel z pełną historią i
  porównaniem aktualnej ceny do pierwszego podejścia (o ile spadła).

• OBSERWOWANIE: gwiazdką zaznaczasz interesującą nieruchomość. Gdy trafi
  ona ponownie na przetarg, dostajesz powiadomienie systemowe.

• ARCHIWUM: osobna strona z możliwością przeglądania, filtrowania i
  sortowania wszystkich historycznych wyników — z medianami cen i zł/m²
  osobno dla lokali mieszkalnych, użytkowych i garaży.

• Interfejs po polsku i po angielsku — przełącznik jednym kliknięciem.

SKĄD POCHODZĄ DANE

Wszystkie dane pochodzą z publicznych ogłoszeń i wyników przetargów
opublikowanych na zgm-gliwice.pl. Rozszerzenie pobiera gotowy, regularnie
odświeżany zbiór danych z publicznego repozytorium GitHub. Nie jest powiązane
z Zakładem Gospodarki Mieszkaniowej ani z Urzędem Miasta Gliwice.

PRYWATNOŚĆ

Rozszerzenie nie zbiera żadnych danych osobowych. Lista obserwowanych
nieruchomości i wybór języka są przechowywane wyłącznie na Twoim komputerze.
Nic nie jest wysyłane do autora ani do żadnej usługi zewnętrznej. Kod jest w
pełni otwarty.

Kod źródłowy i polityka prywatności:
https://github.com/110kc3/przetargimiejskie
```

---

## Description  (full — English)

```
This extension shows the full auction history of municipal properties sold by
Zakład Gospodarki Mieszkaniowej in Gliwice, Poland (zgm-gliwice.pl).

When you look at a current auction listing, you instantly see whether that
property has been put up before — how many times, at what price, and with
what result. A property that has failed to sell several times in a row is
usually a sign of low interest — and often a bargain.

WHAT IT DOES

• On the auction index pages (apartments, commercial units, garages) it adds
  a badge to every listing: "first listing" or "prev N× — M unsold". Colour
  shows the scale: green = new, amber = one failed attempt, red = two or more.

• Shows price per m² next to the asking price, so listings are easy to compare.

• Shows the wadium (deposit) deadline and the property viewing date right on
  the list.

• Hovering a badge opens a table of every prior attempt: date, asking price,
  PLN/m², outcome, and the reason it didn't sell.

• On an individual property page it injects a panel with the full history and
  a comparison of the current price against the first attempt.

• WATCHLIST: star a property you care about. When it goes back to auction,
  you get a desktop notification.

• ARCHIVE: a dedicated page to browse, filter, and sort every historical
  result — with median prices and PLN/m² broken down by apartments,
  commercial units, and garages.

• Polish and English interface — one-click toggle.

WHERE THE DATA COMES FROM

All data comes from public auction announcements and results published on
zgm-gliwice.pl. The extension downloads a prepared, regularly refreshed
dataset from a public GitHub repository. It is not affiliated with Zakład
Gospodarki Mieszkaniowej or the City of Gliwice.

PRIVACY

The extension collects no personal data. Your watchlist and language choice
are stored only on your own computer. Nothing is sent to the author or any
third-party service. The code is fully open source.

Source code and privacy policy:
https://github.com/110kc3/przetargimiejskie
```

---

## Single purpose  (dashboard field)

```
This extension has one purpose: to display historical and current auction
information for municipal properties listed on zgm-gliwice.pl, so a user can
see a property's prior auction attempts, prices, and price-per-m² while
browsing the official site.
```

---

## Permission justifications  (dashboard fields)

**storage**
```
Stores the user's watchlist, language preference, and a cached copy of the
public auction dataset locally on the user's device so the extension works
quickly and remembers settings between sessions.
```

**alarms**
```
Schedules a periodic background check (every ~4 hours) that compares the
user's watchlist against the latest auction data, so the user can be notified
when a watched property is listed again.
```

**notifications**
```
Shows a desktop notification when a property on the user's watchlist is put
up for auction again.
```

**host permission — https://zgm-gliwice.pl/***
```
The content script runs on the auction website to read the listing currently
shown to the user and annotate it with prior-auction information.
```

**host permission — https://raw.githubusercontent.com/110kc3/przetargimiejskie/***
```
Downloads the prepared public auction dataset (three small JSON files) that
the extension displays. No user data is sent with these requests.
```

---

## Screenshots

> The full, current store copy (6 cities, PL + EN) now lives in
> `WEB_STORE_LISTING.md` at the repo root. The text above this line is the
> original Gliwice-only draft, kept for reference.

Current 1280×800 PNGs for the 9-city build, ready to upload (regenerate with
`node make.js`, then render the SVGs to PNG with cairosvg or ImageMagick):

1. `01-on-page-chip.png` — a municipal BIP announcement with the extension's
   info-chip docked beside the title: auction round, asking price, m², zł/m²,
   date, and a deal-score badge (zł/m² vs the city median). The headline feature.
2. `02-popup-all-cities.png` — the popup listing active auctions across the nine
   cities, mixing flats, houses (dom) and land (działka), with a Rodzaj filter,
   deal-score badges and a Google-Maps link per row.
3. `03-web-archive.png` — the searchable archive: summary tiles (incl. houses &
   land), the filter bar with the Rodzaj dropdown, and the sortable history
   table with a geoportal link for each plot.
4. `04-houses-land.png` — the Rodzaj filter in focus: domy and działki with their
   own area column and a geoportal "mapa działki" link per parcel.
5. `05-raporty.png` — the Raporty page: median zł/m² by city (the deal-score
   basis) and the price-drop deals board (Tablica okazji).

---

## Category & language

- Suggested category: **Productivity** (or **Shopping**).
- Primary language: **Polish**.
- Privacy policy URL: `https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md`

---

## Privacy practices tab — Polish (paste into the dashboard)

### storage — uzasadnienie
```
Uprawnienie storage służy do przechowywania na urządzeniu użytkownika trzech rzeczy: (1) listy obserwowanych nieruchomości, (2) wybranego języka interfejsu (polski lub angielski) oraz (3) lokalnej kopii publicznego zbioru danych o przetargach pobranej z GitHuba. Dzięki temu rozszerzenie działa szybko i pamięta ustawienia między sesjami. Dane te nie opuszczają komputera użytkownika i nie są nikomu wysyłane.
```

### alarms — uzasadnienie
```
Uprawnienie alarms służy do zaplanowania cyklicznego sprawdzania w tle (co około 4 godziny), które porównuje listę obserwowanych nieruchomości użytkownika z najnowszymi danymi o przetargach. Dzięki temu użytkownik otrzymuje powiadomienie, gdy obserwowana nieruchomość zostanie ponownie wystawiona na przetarg. Service worker w Manifest V3 jest usypiany, więc cykliczne zadanie wymaga interfejsu alarms.
```

### notifications — uzasadnienie
```
Uprawnienie notifications służy do wyświetlenia powiadomienia systemowego, gdy nieruchomość z listy obserwowanych użytkownika zostanie ponownie wystawiona na przetarg. Powiadomienia są tworzone wyłącznie lokalnie, na podstawie publicznych danych o przetargach, i nie zawierają żadnych danych osobowych.
```

### Uprawnienia dotyczące hosta — uzasadnienie
```
Rozszerzenie używa dwóch uprawnień hosta. (1) https://zgm-gliwice.pl/* — skrypt treści działa na stronie przetargów ZGM, aby odczytać aktualnie wyświetlane ogłoszenie i wzbogacić je o informacje o wcześniejszych przetargach: dawne ceny, cenę za m², historię prób sprzedaży, terminy wadium i oględzin. (2) https://raw.githubusercontent.com/110kc3/przetargimiejskie/* — service worker pobiera stąd przygotowany, publiczny zbiór danych o przetargach (trzy małe pliki JSON), który rozszerzenie wyświetla. Z żądaniami do GitHuba nie są wysyłane żadne dane użytkownika.
```

### Kod zdalny
Select: **Nie, nie używam uprawnień Kod zdalny.**
(The extension downloads only JSON data files — never JavaScript or Wasm.
JSON is data, not executable code, so this is not "remote code".)

### Użycie danych
Check **none** of the data categories. The extension collects no personally
identifiable data, no location, no web history, no user activity. The watchlist
holds only municipal-property identifiers; the language choice is a UI setting.
Nothing is transmitted off the device.

Confirm all three statements (all true):
- Nie sprzedaję ani nie przesyłam danych użytkowników osobom trzecim — ✔
- Nie używam danych użytkownika w celach niezwiązanych z przeznaczeniem — ✔
- Nie używam danych do ustalania zdolności kredytowej — ✔

### URL polityki prywatności
```
https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md
```
