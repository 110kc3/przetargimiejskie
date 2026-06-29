# Spike — Skarżysko-Kamienna (Świętokrzyskie · powiat skarżyski)

> **Status:** spike LIVE-VERIFIED — 2026-06-29. VERDICT: BUILD (Low-Medium effort).

## TL;DR

Gmina Skarżysko-Kamienna (miasto na prawach powiatu, ~45k mieszkańców) aukcjonuje lokale mieszkalne przez ustny przetarg nieograniczony, ogłoszenia i wyniki publikuje wyłącznie na własnym BIP pod `bip.skarzysko.pl`. Strona działa na Logonet CMS (server-rendered HTML), odpowiada bez auth/bot-bloków, udostępnia też XML per-record. Wydział Gospodarki Nieruchomościami (GN) prowadzi całość bezpośrednio — brak zewnętrznego TBS/MZGM. Wolumen niski (~2–5 lokali mieszkalnych/rok), ale format jest czysty i analogiczny do Bytomia/Tarnowskich Gór.

---

## 1. Sells municipal property at auction?

**TAK — potwierdzone LIVE.** Gmina sprzedaje lokale mieszkalne przez *ustny przetarg nieograniczony*. Przykłady zweryfikowane bezpośrednio na BIP:

- **ul. Chałubińskiego 8/5** (33,60 m², cena wywoławcza 95 800 zł) — trzy kolejne przetargi ustne nieograniczone (maj 2024, wrzesień 2024, styczeń 2025). Trzeci przetarg zakończył się wynikiem negatywnym (brak wadium). URL: https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/26-110-skarzysko-kamienna-ul-chalubinskiego-nr-8-lokal-nr-5-informacja-o-wyniku-trzeciego-przetargu
- **ul. Staffa 25/1** — przetarg maj 2024. URL: https://bip.skarzysko.pl/przetarg-nieruchomosci/9821/26-110-skarzysko-kamienna-ul-staffa-nr-25-lokal-nr-1-informacja-o-wyniku-przetargu
- **ul. Staffa 13/2** — przetarg + wynik. URL: https://bip.skarzysko.pl/przetarg-nieruchomosci/8141/26-110-skarzysko-kamienna-ul-staffa-13-2-informacja-o-wyniku-przetargu
- **ul. Akacjowa 1**, **ul. Chałubińskiego 2/3**, **ul. Legionów 107/402**, **Al. Piłsudskiego 32/26** — wcześniejsze lokale mieszkalne (2020–2023).

**Sprzedaż bezprzetargowa na rzecz najemcy** (art. 34 u.g.n.) też istnieje i opisana na BIP (procedura: wniosek → wycena → wykaz → umowa notarialna bez przetargu). Te przypadki NIE pojawiają się na tablicy przetargowej — trafiają tylko do osobnej sekcji GN. Oznacza to, że tablica przetargowa pokazuje wyłącznie lokale, na które NIE ma najemcy z pierwszeństwem, albo najemca zrezygnował.

Podmiot ogłaszający: **Prezydent Miasta Skarżyska-Kamiennej** za pośrednictwem **Wydziału Gospodarki Nieruchomościami (GN)**, bez zewnętrznego zarządcy. Brak TBS/MZGM jako pośrednika dla przetargów.

---

## 2. Where published? (hosts + boards, URLs)

| Typ | URL | Uwagi |
|-----|-----|-------|
| Tablica przetargów nieruchomości (lista) | https://bip.skarzysko.pl/przetargi-nieruchomosci/1/10 | Paginacja: `/N/10`, 24 strony (łącznie ~240 rekordów, 2017–2026) |
| Przetarg nieruchomości — pojedynczy rekord | https://bip.skarzysko.pl/przetarg-nieruchomosci/{ID}/{slug} | Ogłoszenie i wynik jako osobne rekordy z tym samym ID bazy |
| Wynik przetargu — przykład | https://bip.skarzysko.pl/przetarg-nieruchomosci/10876/... | Zawiera "Informacja o wyniku" + cena wywoławcza + opis wyniku |
| XML feed (lista strony) | https://bip.skarzysko.pl/przetargi-nieruchomosci/xml/1/1 | Dostępny per strona; typ: `application/xml` |
| XML per-rekord | https://bip.skarzysko.pl/przetarg-nieruchomosci/xml/{ID}/1 | Jeden rekord w XML |
| BIP główna | https://bip.skarzysko.pl/ | Logonet CMS v2.9.0; ostatnia aktualizacja 2026-06-29 |
| Procedura sprzedaży bezprzetargowej | https://bip.skarzysko.pl/artykul/49/894/sprzedaz-komunalnych-lokali-mieszkalnych | Informacja o trybie najemca-pierwokup |

**Dodatkowe BIP:** Istnieje też `https://www.umskarzysko.bip.doc.pl/` (starszy system doc.pl) — w wynikach wyszukiwania pojawia się jako alternatywny adres urzędu, ale wszystkie przetargi nieruchomości prowadzone są przez `bip.skarzysko.pl` (Logonet).

---

## 3. Format + rendering

- **Technologia:** Logonet CMS v2.9.0 (ten sam silnik co wiele gmin, np. analogiczny do Tarnowskich Gór). Server-rendered HTML.
- **Lista przetargów:** tabele HTML — każdy rekord to `<table>` z polami: Adres nieruchomości, Przetarg na, Typ przetargu, Rodzaj nieruchomości, Cena wywoławcza, Data przetargu. Link do szczegółów.
- **Strona rekordu:** analogiczna tabela + blok tekstowy z pełną treścią ogłoszenia (plain text HTML, nie PDF). Treść wynika zawiera słownie: co kupiono, cena wywoławcza, wynik (pozytywny/negatywny).
- **Wynik przetargu:** osobny rekord na liście z dopiskiem "informacja o wyniku przetargu" w tytule, typ przetargu i cena wywoławcza taka sama jak ogłoszenie. Cena osiągnięta — w treści tekstowej (nie w polach strukturalnych tabeli). Wymaga parsowania tekstu.
- **PDF:** dostępny link "Zapisz do PDF" — ale to generowany on-the-fly PDF z HTML, nie skan. Nie ma potrzeby OCR.
- **XML:** dostępny feed, ale odpowiedź serwera zwróciła `[binary data]` — prawdopodobnie XML z charset issues lub gzip. Wymaga weryfikacji przy implementacji.
- **Auth/bot-bloki:** brak — strony odpowiadają bez cookies/JS. Cookiebar jest opcjonalna, nie blokuje treści.
- **Filtrowanie po typie:** formularz wyszukiwarki na liście pozwala filtrować po "Rodzaj nieruchomości = lokal mieszkalny" i "Typ przetargu = przetarg ustny nieograniczony" — parametry GET; URL-ów filtrowanych GET nie widać w fetchu, ale interfejs jest dostępny.

---

## 4. Volume + achieved-price stream

- **Łączna tablica nieruchomości:** 24 strony × 10 = ~240 rekordów od 2017. Obejmuje wszystkie typy (grunty, zabudowane, lokale użytkowe, lokale mieszkalne, dzierżawy).
- **Lokale mieszkalne:** na podstawie przeglądu znalezionych rekordów — ok. 5–10 unikatowych lokali w całym archiwum (2017–2025), z których każdy mógł przejść przez 1–3 kolejne przetargi. Szacunek: **2–4 nowe lokale mieszkalne rocznie** wystawiane na przetarg ustny nieograniczony. Wolumen niski.
- **Ceny wywoławcze lokali:** 31 600 zł (małe mieszkanie Staffa 25/1) – 112 100 zł (Chałubińskiego 8/5 1. przetarg) – 95 800 zł (Chałubińskiego 8/5 3. przetarg, obniżona).
- **Cena osiągnięta:** zawarta w treści bloku tekstowego "Informacja o wyniku". Przykład negatywny: "Na przedmiotowy lokal nie zostało wpłacone wadium, a w związku z tym przetarg zakończył się wynikiem negatywnym." Przy wyniku pozytywnym — cena wylicytowana podana słownie w tekście.
- **Dominujące typy na tablicy:** grunty niezabudowane (deweloperskie, rolne) + duże nieruchomości komercyjne — stanowią ~80% tablicy. Lokale mieszkalne to mniejszość.

---

## 5. Adapter effort + verdict

**Closest analog:** Tarnowskie Góry / Bytom — ten sam Logonet CMS, ta sama struktura HTML tabeli, te same pola. Wystarczy przekopiować scraper z minimalną adaptacją URL-ów i selektorów.

**Effort:** Low-Medium.
- Listing scraper: trivial (HTML table, paginacja przez `/N/10`, filtr GET po `rodzaj=lokal_mieszkalny`).
- Detail scraper: trivial (HTML table + tekst).
- Achieved-price parsing: wymaga regex na blok tekstowy — identyczne podejście jak inne Logonet-miasta.
- XML feed: potencjalnie prostsze alternatywne parsowanie, ale wymaga zbadania encodingu.
- Bezprzetargowe sprzedaże najemcom NIE trafiają na tablicę — brak ryzyka zanieczyszczenia.

**Blockers / Risks:**
1. Wolumen niski (~2–4/rok) — ROI słabe dla samodzielnego adaptera; sensowne jako część szerszego Świętokrzyskie sweep.
2. Cena osiągnięta nie jest w polach strukturalnych — wymaga text-parsing, ale jest w HTML (nie PDF-skan), więc niskie ryzyko.
3. XML feed mógł zwrócić binary data przez gzip — wymaga weryfikacji Content-Encoding przy implementacji.
4. Negatywne wyniki przetargu (brak nabywcy) są powszechne i muszą być jawnie oznaczane jako `wynik=negatywny`, nie jako "sprzedano za 0 zł".

**VERDICT: BUILD** — czyste HTML, bez auth, wyniki przetargów dostępne on-page, Logonet CMS identyczny z już zaimplementowanymi miastami. Jedyny hamulec to niski wolumen — zalecane jako moduł w Świętokrzyskie batch, nie jako priorytet standalone.
