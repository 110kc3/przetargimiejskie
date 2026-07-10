<!--
================================================================================
EDITOR'S NOTE — READ BEFORE PUBLISHING  (English; delete this block on publish)
================================================================================
WHAT THIS IS
  A DRAFT RODO/GDPR privacy policy covering the przetargimiejskie.pl SITE data
  flows that do not exist yet but are planned in TODO §5 / GTM §2.1 §5:
    (1) the newsletter (double-opt-in e-mail signup), and
    (2) the partner lead form ("zostaw kontakt, oddzwoni doradca").
  Today the site collects NOTHING (site/privacy/index.html is accurate as-is).
  The moment either flow goes live, that page becomes false and MUST be replaced
  with something like this. This draft is that replacement, written ahead of
  time so the launch is approve-and-ship, not decide-then-wait.

STATUS: DRAFT. Not legal advice. Before publishing, Kamil must:
  1. Have it reviewed by a lawyer / accept the risk (it is a published legal
     document with UODO exposure).
  2. Fill every «PLACEHOLDER» below — they depend on decisions not yet made:
       • «ADMINISTRATOR» — controller legal identity. Until a JDG is registered
         (TODO §5), this is Kamil as a natural person operating the service;
         after JDG, the firm name + NIP + address. Pick one.
       • «ESP» — the chosen e-mail provider (Resend / Buttondown / MailerLite),
         its role as a processor (umowa powierzenia / DPA), and whether it stores
         data outside the EEA (→ keep the SCC clause; else delete it).
       • «PARTNER(ZY)» — the actual partner(s) leads are routed to, once signed.
         Until then the lead form must not be live.
       • «ANALITYKA» — only if a cookieless analytics tool (Plausible/Umami) is
         added; otherwise delete that section.
  3. Decide scope: publish only the sections whose flow is actually live. Do NOT
     ship the lead-form section before a partner exists, nor the newsletter
     section before the ESP + double-opt-in are wired.

RELATIONSHIP TO THE EXTENSION POLICY
  The Chrome extension stays zero-data — its policy (PRIVACY.md, and the extension
  paragraph on site/privacy) is UNCHANGED and correct. This document only adds the
  SITE-side collection. Keep both: the extension section still says "nothing
  leaves your device"; the site section below describes the new flows.

HOW TO PUBLISH
  Port the Polish body below into site/privacy/index.html (same dark-theme
  template), bump "Ostatnia aktualizacja", and link it from the newsletter signup
  and the lead form (a checkbox: "Zapoznałem/am się z polityką prywatności").
================================================================================
-->

# Polityka prywatności — przetargimiejskie.pl (PROJEKT / DRAFT)

> **To jest projekt dokumentu.** Wchodzi w życie dopiero po uruchomieniu
> newslettera lub formularza kontaktu do partnera i po uzupełnieniu pól
> oznaczonych «…». Do tego czasu obowiązuje dotychczasowa, „zerowa" polityka
> (serwis nie zbiera żadnych danych).

**Ostatnia aktualizacja:** «DATA PUBLIKACJI»

## 1. Kto jest administratorem danych

Administratorem Twoich danych osobowych jest **«ADMINISTRATOR — imię i nazwisko
lub firma, adres, NIP jeśli dotyczy»**, prowadzący serwis internetowy
przetargimiejskie.pl (dalej „Serwis").

Kontakt we wszystkich sprawach dotyczących danych osobowych, w tym realizacji
Twoich praw: **kontakt@przetargimiejskie.pl**.

Nie wyznaczono inspektora ochrony danych (IOD) — nie ma takiego obowiązku;
kontakt w sprawach danych jak wyżej.

## 2. Czego dotyczy ta polityka

Serwis sam w sobie jest statyczną witryną z publicznymi danymi o przetargach na
nieruchomości miejskie i **nie wymaga zakładania konta ani podawania danych, aby
z niego korzystać**. Dane osobowe przetwarzamy wyłącznie wtedy, gdy dobrowolnie
je nam przekażesz w jednej z poniższych sytuacji:

- **A. Newsletter** — gdy zapiszesz się na cykliczny przegląd przetargów.
- **B. Formularz kontaktu do partnera („zostaw kontakt")** — gdy poprosisz, aby
  skontaktował się z Tobą współpracujący doradca.
- **C. Kontakt e-mail** — gdy napiszesz do nas na adres kontaktowy.

Osobno: **rozszerzenie do przeglądarki „przetargimiejskie"** nie wysyła nam
żadnych danych — wszystko, co zapamiętuje (lista obserwowanych, język, motyw,
pamięć podręczna), zostaje na Twoim urządzeniu. Szczegóły w sekcji „Rozszerzenie"
poniżej i w [PRIVACY.md](https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md).

## 3. Newsletter (jeśli uruchomiony)

| | |
|---|---|
| **Jakie dane** | Adres e-mail. Dodatkowo, jako dowód wyrażenia zgody, zapisujemy datę i godzinę zapisu oraz potwierdzenia (mechanizm *double opt-in*) i adres IP, z którego dokonano potwierdzenia. |
| **Po co** | Aby wysyłać Ci cykliczny, bezpłatny przegląd nowych i rozstrzygniętych przetargów. |
| **Podstawa prawna** | Twoja **zgoda** — art. 6 ust. 1 lit. a) RODO. Zgoda na otrzymywanie informacji handlowej/marketingowej drogą elektroniczną obejmuje także art. 10 ustawy o świadczeniu usług drogą elektroniczną oraz art. 172 Prawa telekomunikacyjnego. |
| **Potwierdzenie zapisu** | Stosujemy *double opt-in*: po zapisaniu wysyłamy wiadomość z linkiem potwierdzającym; bez kliknięcia nie dodajemy Cię do listy i nie wysyłamy newslettera. |
| **Odbiorcy** | Dostawca usługi wysyłki e-mail **«ESP»**, działający jako podmiot przetwarzający na podstawie umowy powierzenia przetwarzania (DPA). |
| **Jak długo** | Do momentu wypisania się lub wycofania zgody. Wypisać możesz się w każdej chwili — linkiem „wypisz się" w stopce każdej wiadomości albo mailem na adres kontaktowy. Dane potwierdzenia zgody możemy zachować krótko po wypisaniu, aby wykazać zgodność z prawem. |

## 4. Formularz kontaktu do partnera (jeśli uruchomiony)

W niektórych miejscach Serwisu (wyraźnie oznaczonych jako **współpraca /
materiał partnera**, nigdy jako treść redakcyjna) możesz zostawić swój kontakt,
aby oddzwonił do Ciebie współpracujący z nami specjalista — np. doradca
kredytowy, rzeczoznawca majątkowy lub biuro nieruchomości.

| | |
|---|---|
| **Jakie dane** | Imię, adres e-mail lub numer telefonu, oraz treść zapytania / wskazanie nieruchomości, której dotyczy. |
| **Po co** | Wyłącznie po to, aby przekazać Twój kontakt wybranemu partnerowi, który się z Tobą skontaktuje. |
| **Podstawa prawna** | Twoja **zgoda** — art. 6 ust. 1 lit. a) RODO — w tym wyraźna zgoda na **przekazanie danych partnerowi**. |
| **Odbiorca** | Konkretny partner wskazany przy formularzu: **«PARTNER(ZY) — nazwa/nazwy»**. |
| **WAŻNE — odrębny administrator** | Po przekazaniu Twoich danych partner staje się **niezależnym, odrębnym administratorem** tych danych i przetwarza je na własną odpowiedzialność, w swoich celach i zgodnie z **własną polityką prywatności**. Nie odpowiadamy za dalsze przetwarzanie danych przez partnera. Zanim zostawisz kontakt, informujemy Cię, komu dokładnie dane przekażemy. |
| **Jak długo** | Przechowujemy Twoje zgłoszenie tylko przez czas potrzebny do przekazania go partnerowi i obsłużenia sprawy (co do zasady nie dłużej niż «X» miesięcy), po czym je usuwamy. |

Podanie danych jest zawsze dobrowolne; korzystanie z Serwisu w żaden sposób od
tego nie zależy.

## 5. Kontakt e-mail

Jeśli napiszesz do nas na **kontakt@przetargimiejskie.pl**, przetwarzamy dane
zawarte w wiadomości wyłącznie po to, aby na nią odpowiedzieć i załatwić sprawę.
Podstawą jest nasz **prawnie uzasadniony interes** (art. 6 ust. 1 lit. f) RODO)
w obsłudze korespondencji. Korespondencję przechowujemy tak długo, jak to
potrzebne do obsługi sprawy.

## 6. Logi serwera

Serwis jest hostowany na serwerze «OVH / dostawca hostingu». Jak każda strona,
serwer może zapisywać standardowe logi techniczne (m.in. adres IP, datę i godzinę
zapytania, typ przeglądarki) w celu zapewnienia bezpieczeństwa i diagnostyki.
Podstawą jest **prawnie uzasadniony interes** (art. 6 ust. 1 lit. f) RODO).
Logi przechowujemy krótko i nie łączymy ich z Twoją tożsamością.

## 7. Pliki cookies i analityka

- **Cookies:** Serwis nie używa plików cookies do śledzenia. «Jeśli używane są
  wyłącznie techniczne/niezbędne cookies — opisz je tu; w przeciwnym razie:
  Serwis nie zapisuje plików cookies.»
- **Analityka «jeśli wdrożona»:** Do zliczania odwiedzin możemy używać narzędzia
  **«ANALITYKA — Plausible/Umami»**, które działa **bez plików cookies i bez
  zbierania danych osobowych** (statystyki są zbiorcze i anonimowe), dlatego nie
  wymaga Twojej zgody. Jeśli kiedykolwiek wprowadzimy narzędzie oparte na cookies
  lub identyfikujące użytkownika, najpierw poprosimy o zgodę i zaktualizujemy tę
  politykę.

## 8. Rozszerzenie do przeglądarki

Rozszerzenie „przetargimiejskie" **nie zbiera ani nie wysyła żadnych danych
osobowych**. Wszystko, co zapamiętuje (pobrane dane w pamięci podręcznej, lista
obserwowanych nieruchomości, wybór języka i motywu), zostaje lokalnie w Twojej
przeglądarce (`chrome.storage`) i nie jest nigdzie przesyłane. Pełny opis:
[PRIVACY.md](https://github.com/110kc3/przetargimiejskie/blob/main/PRIVACY.md).

## 9. Przekazywanie danych poza EOG

«Jeśli którykolwiek podmiot przetwarzający (np. dostawca newslettera) przechowuje
dane poza Europejskim Obszarem Gospodarczym: przekazujemy dane wyłącznie do
podmiotów zapewniających odpowiedni poziom ochrony, na podstawie standardowych
klauzul umownych (SCC) zatwierdzonych przez Komisję Europejską. — W przeciwnym
razie usuń tę sekcję i napisz: Nie przekazujemy danych poza EOG.»

## 10. Twoje prawa

W związku z przetwarzaniem Twoich danych masz prawo do:

- **dostępu** do swoich danych i uzyskania ich kopii,
- **sprostowania** (poprawienia) danych,
- **usunięcia** danych („prawo do bycia zapomnianym"),
- **ograniczenia** przetwarzania,
- **przenoszenia** danych,
- **sprzeciwu** wobec przetwarzania opartego na prawnie uzasadnionym interesie,
- **wycofania zgody** w dowolnym momencie — bez wpływu na zgodność z prawem
  przetwarzania sprzed wycofania (dotyczy newslettera i formularza kontaktu).

Aby skorzystać z któregokolwiek prawa, napisz na **kontakt@przetargimiejskie.pl**.

Masz też prawo wnieść **skargę do organu nadzorczego** — Prezesa Urzędu Ochrony
Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.

## 11. Zautomatyzowane decyzje

Nie podejmujemy wobec Ciebie decyzji w sposób wyłącznie zautomatyzowany ani nie
stosujemy profilowania wywołującego skutki prawne.

## 12. Zmiany polityki

Możemy aktualizować tę politykę, np. gdy dodamy nową funkcję przetwarzającą dane.
Aktualna wersja jest zawsze dostępna pod tym adresem, z datą ostatniej
aktualizacji na górze. O istotnych zmianach dotyczących newslettera
poinformujemy subskrybentów e-mailem.

## 13. Źródła danych o przetargach

Prezentowane w Serwisie dane o przetargach pochodzą z publicznych Biuletynów
Informacji Publicznej urzędów miast i miejskich zakładów gospodarki
mieszkaniowej. Serwis jest nieoficjalny i niezwiązany z żadnym urzędem.
