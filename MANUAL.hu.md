*[English version](MANUAL.md)*

# SDL-88 Design Tool – Használati útmutató

## 1. Áttekintés

Az SDL-88 Design Tool **SDL process diagramok** (ITU-T Z.100) szerkesztője és szimulátora. Böngészőben fut, saját, canvasra rajzolt ablakkezelővel.

* **Editor:** a rendszer processzeit a szabványos SDL szimbólumokkal rajzolod; a diagram elrendezése automatikus.
* **Szimulátor:** a rendszer lépésenként futtatható; minden processzpéldánynak saját ablaka van, a jelek ablakról ablakra repülnek.
* **Message Sequence Chart:** a szimuláció MSC-ként rögzül, és exportálható.
* **SDL elmélet:** rövid bevezetés az SDL-be élő diagramokkal (Help menü, F1).

A program az **index.html**-lel indul. Webszerveren keresztül nyisd meg (például `python -m http.server` a mappában, VS Code Live Server, vagy a weboldal): a példákat egy mappából olvassa, és egy közvetlenül a lemezről (file://) megnyitott oldal nem olvashat mappát.

---
## 2. A képernyő és az ablakok

A munkaterületen menüsor és a következő ablakok vannak:

| Ablak | Mire való |
|---|---|
| **Symbols** | az SDL szimbólumok palettája, innen húzod őket a diagramra |
| **Project** | a rendszer processzei, a kezdeti példányszámukkal |
| **Process … – editor** | minden processznek egy szerkesztőablak |
| **Simulator** | a szimuláció vezérlése, a környezet (env) és a napló |
| **Message Sequence Chart** | a futó szimuláció MSC-je |
| **processzpéldány-ablakok** | szimuláció közben, minden példánynak egy |

Ablakkezelés:

* **mozgatás:** a címsor húzásával
* **átméretezés:** a jobb alsó sarok fogantyújával
* **összecsukás / kinyitás:** a címsor kis háromszögével, vagy dupla kattintással a címsorra
* **bezárás:** a címsor × gombjával (a bezárt ablakok a **Window** menüből újra megjeleníthetők)
* amelyik ablakra kattintasz, előre jön és aktív lesz (kék címsor); a billentyűzet az aktív ablakra hat
* **Window / Default arrangement:** minden ablakot visszatesz a helyére
* **Window / Tile editors**, **Tile process instances**, **Collapse all instances**
* **Window / Debug: mouse x,y:** az eredeti, 2019-es változat kis koordinátaablaka

---
## 3. Projekt és processzek

Egy **projekt** (SDL system) **processzekből** áll. Minden processznek van:

* **neve** (betűk, számjegyek és _),
* egy **DCL** doboza a változóival,
* egy **start átmenete**,
* **állapotai**, és minden állapotban **inputjai** (és save-jei) az átmeneteikkel,
* **kezdeti példányszáma**: hány példánya létezik a szimuláció indulásakor. A 0 azt jelenti, hogy példányait csak egy másik processz **Create** szimbóluma hozza létre (mint a GAME a Guessing Game-ben).

A **Project** ablak a processzeket `NÉV [kezdeti példányszám]` formában sorolja fel.

* dupla kattintás egy processzre: megnyitja a szerkesztőjét
* **New** gomb: új processz; **Open**: a kijelölt processz szerkesztője
* jobb kattintás vagy a **…** gomb: átnevezés, kezdeti példányszám, processz törlése, a projekt átnevezése

Ugyanez megvan a **Process** menüben is (New process, Edit …, Rename …, Initial instances of …).

---
## 4. Processz rajzolása

A diagram elrendezése automatikus: a szimbólumokat sosem kézzel helyezed el, csak azt mondod meg, hogy *az átmenetben hová* kerüljön egy szimbólum. Egy process diagramon látható:

* a **DCL** doboz és a **Start** szimbólum a start átmenettel,
* minden **állapot** az inputjaival egymás mellett, minden input alatt az átmenete,
* a **decision** első ága egyenesen lefelé folytatódik, a többi ág jobbra megy.

### 4.1 Szimbólumok beszúrása

* **Húzz egy szimbólumot a Symbols ablakból a diagram egy szimbólumára:** az *után* szúródik be. Húzás közben a cél szimbólum kiemelődik.
* **Vagy jelölj ki egy szimbólumot a diagramon, aztán kattints a Symbols ablak egyik szimbólumára.**
* **Vagy jobb kattintás egy szimbólumon:** Insert task / output / decision / create / timer.

Melyik szimbólum hová kerülhet:

| Szimbólum | Mire ejtsd |
|---|---|
| **Task, Output, Decision, Create, Timer** | egy átmenet bármely szimbólumára (start, input, task, …, vagy a lezáróra: akkor elé kerül) |
| **Input, Save** | egy állapotra (az állapot új inputja) vagy egy inputra (új input mellé) |
| **State** | a háttérre: új állapot; egy lezáróra: *nextstate* lesz belőle |
| **Stop** (kör × jellel) | egy lezáróra: az átmenet stoppal ér véget |

Az új szimbólum szövege azonnal szerkeszthető.

### 4.2 Szerkesztés

* **dupla kattintás** vagy **F2** (vagy Enter): a kijelölt szimbólum szövegének szerkesztése. Az Enter befejezi, a Shift+Enter új sor (a többsoros szimbólumokban), az Esc elveti.
* **Del:** a kijelölt szimbólum törlése. Decision törlésekor az első ága megmarad. Nextstate-en a Del stopra cseréli.
* **jobb kattintás** egy szimbólumon: annak a szimbólumnak a menüje, például
  * állapot: Add input, Add save, Edit text (átnevezés), Delete
  * decision: Add branch
  * lezáró: Nextstate / Stop, Go to state …
  * ágcímke (true / false / …): szerkesztés, Delete branch (ha kettőnél több ág van)
* **jobb kattintás a háttéren:** New state, Fit to window, Zoom 100%
* **Edit / Undo (Ctrl+Z)** és **Redo (Ctrl+Y)** minden változtatást visszavon, a törlést is.

Jó tudni:

* Egy állapot átnevezése az összes rá mutató nextstate-et is átnevezi.
* Ha egy nextstate-be nem létező állapot nevét írod, az állapot létrejön.
* A `-` mint nextstate azt jelenti: marad ugyanabban az állapotban.

### 4.3 Mozgás a diagramon

* **görgő:** fel-le görgetés; **Shift+görgő:** balra-jobbra
* **Ctrl+görgő:** nagyítás az egér helyén
* **a háttér húzása:** mozgatás
* **0:** ablakhoz igazítás, **+ / -:** nagyítás, kicsinyítés

---
## 5. A szimbólumok szövege

A változók, jelek, állapotok és processzek neve **nem kis-nagybetű érzékeny** (`n` és `N` ugyanaz). A többsoros szimbólumokban a Shift+Enter új sort kezd, ez csak a megjelenést befolyásolja.

### 5.1 DCL – változók

A start oszlop tetején lévő DCL doboz a processz változóit deklarálja. Minden változó 0-ról indul, hacsak nem kap kezdőértéket:

```
n, m
credit := 100, name := 'abc'
```

Azok a változók, amelyek egy taskban vagy input paraméterként kapnak értéket, maguktól létrejönnek; de olyan változót olvasni, amelyet sosem deklaráltál és sosem kapott értéket, hiba.

### 5.2 Task

Utasítások `;`-vel vagy új sorral elválasztva:

```
n := 0
n := n + 1;  m := n * 2
n++
n--
set(now + 5, T)
reset(T)
print('n is', n)
```

* `x := kifejezés` (vagy `x = kifejezés`): értékadás
* `x++`, `x--`: növelés, csökkentés
* `set(idő, T)`, `reset(T)`: timerek, lásd a 7. fejezetet
* egy önálló függvényhívás, például `print(...)`

### 5.3 Output

```
PROMPT to player
INIT(sender, n) to offspring
MSG(count)
WINNER to player; LOG(1) to env
```

* `JEL(argumentumok) to címzett` – az argumentumok kifejezések, a küldés pillanatában értékelődnek ki
* `to …` nélkül a jel egy olyan példányhoz megy, amelynek processze tartalmaz erre a jelre inputot (elsősorban olyanhoz, amelyik épp olyan állapotban vár, ahol fogadja), különben a környezethez
* egy output szimbólumban több jel: `;`-vel elválasztva
* a címzett egy *pid kifejezés*, lásd a 6. fejezetet

### 5.4 Input

```
CALL
INIT(player, n)
GUESS(m)
A, B
*
```

* `JEL(param1, param2)`: a jel értékei ezekbe a változókba kerülnek
* `A, B`: ugyanaz az átmenet több jelre
* `*`: minden jel, amelyre nincs másik input, és nincs ebben az állapotban save-elve

### 5.5 Save

```
GUESS
PRODUCED, ACK
*
```

A felsorolt jelek **a sorban maradnak**, amíg a processz ebben az állapotban van; később, egy másik állapotban kerülnek sorra. A `*` mindent save-el, amire itt nincs input.

### 5.6 Decision

A kérdés egy kifejezés; a végén lévő `?` megengedett, a program figyelmen kívül hagyja:

```
n = m ?
random(1, 6) ?
```

Az **ágcímkék** (kattintással szerkeszthetők) mondják meg, melyik érték merre megy:

| Ágcímke | Akkor választja, ha az érték … |
|---|---|
| `true` / `false` (vagy yes / no, igen / nem) | igaz / hamis |
| `3`, `'abc'`, `(5)` | egyenlő vele |
| `> 5`, `<= 2`, `/= 0`, `!= 0` | teljesíti az összehasonlítást |
| `else` | egyik másik ág sem illeszkedett |

Jobb kattintás a decisionön: **Add branch**. Ha egyik ág sem illeszkedik, a szimuláció hibával megáll.

### 5.7 Create

Egy processz neve: `GAME`. Létrejön egy új példánya; a létrehozóban az `offspring` az új példány lesz, az újban a `parent` a létrehozó.

### 5.8 Lezárók

* **nextstate** (az állapotszimbólum az átmenet végén): egy állapot neve, vagy `-` ugyanarra az állapotra
* **stop** (kör × jellel): a példány megszűnik; a később neki küldött jelek elvesznek

---
## 6. Kifejezések

### 6.1 Értékek és műveletek

* **számok:** `0`, `42`, `3.5`; **szövegek:** `'abc'` vagy `"abc"`; **logikai értékek:** `true`, `false`
* **aritmetika:** `+  -  *  /`, `mod` (vagy `%`) és `rem`
  * két egész szám `/` osztása egész osztás: `7 / 2` értéke 3
  * a `mod` sosem negatív: `-1 mod 5` értéke 4; a `rem` megtartja az előjelet: `-1 rem 5` értéke -1
  * a `+` szövegeket fűz össze: `'Villa' + 2` értéke `'Villa2'`
* **összehasonlítás:** `=` vagy `==`, `/=` vagy `!=` vagy `<>`, `<`, `>`, `<=`, `>=` (a szövegek egyenlőségét kis-nagybetűtől függetlenül vizsgálja)
* **logika:** `and` (`&&`), `or`, `not` (`!`)
* **zárójelek** a szokásos módon

### 6.2 Különleges nevek

| Név | Értéke |
|---|---|
| `self` | ennek a példánynak a pid-je |
| `sender` | az utoljára fogadott jel küldőjének pid-je |
| `parent` | a példány, amelyik ezt létrehozta (a kezdeti példányoknál env) |
| `offspring` | az ez által utoljára létrehozott példány |
| `now` | az aktuális szimulációs idő |
| `env` | a környezet |

### 6.3 Függvények

| Függvény | Eredmény |
|---|---|
| `random(a, b)` | véletlen **egész szám** a-tól b-ig, mindkét végpontot beleértve |
| `random(n)` | véletlen egész szám 1-től n-ig |
| `abs(x)` | abszolút érték |
| `min(a, b, …)`, `max(a, b, …)` | legkisebb, legnagyobb |
| `floor(x)`, `round(x)` | lefelé kerekítés, kerekítés a legközelebbire |
| `print(…)` vagy `log(…)` | kiírja az argumentumait a szimuláció naplójába |

### 6.4 A random használata

A `random` minden kiértékelésnél új számot sorsol, így ugyanaz a modell minden futásban másképp viselkedhet.

* dobókocka egy taskban: `dobas := random(1, 6)`
* véletlen késleltetés: `set(now + random(2, 4), T)` – a timer 2, 3 vagy 4 időegység múlva jár le
* véletlen választás egy decisionben: kérdés `random(1, 2) ?`, ágak `1` és `2`; vagy `random(1, 10) <= 3 ?`, ágak `true` (30%) és `false` (70%)
* véletlen címzett: `PING to 'Server' + random(1, 3)` a Server1, Server2 vagy Server3 példánynak küld

A véletlen viselkedés jó a versenyhelyzetek bemutatására, de ha egy szimuláció *nem* mutatott ki egy hibát (például holtpontot), az nem bizonyítja, hogy a hiba nem fordulhat elő – lásd a Dining Philosophers példát.

---
## 7. Jelek, címzettek és idő

### 7.1 Pid kifejezések – hová megy a jel

A `to` utáni címzett lehet

* `self`, `sender`, `parent`, `offspring`, `env`
* egy pid-et tartalmazó változó (például `player`, amely korábban a `sender` értékét kapta)
* egy példány neve: `GAME1`, `Villa3`
* egy processz neve: `Server` – annak első élő példánya
* bármely kifejezés, amelynek ezek egyike az értéke: `'Villa' + (en mod n + 1)`

A példányok neve a processzük neve és egy sorszám: MA1, GAME1, GAME2, …

### 7.2 Timerek

* `set(now + 5, T)` egy taskban: a T timer a now+5 időpontban jár le. Egy futó timer újraindítása előlről kezdi.
* `reset(T)`: leállítja a T timert (és eltávolítja a sorból a már lejárt, de még fel nem dolgozott T-t).
* Amikor egy timer lejár, a **T** jel a példány saját sorába érkezik (sender = self). A kezeléséhez írj egy `T` inputot.

### 7.3 Az idő

Az idő diszkrét, 0-ról indul. **Csak akkor halad, ha semmi más nem történhet:** amíg bármelyik példány végrehajthat valamit vagy fogadhat egy jelet, a `now` nem változik. Ezután az idő a következő timer lejártára ugrik. A jelküldés nem vesz igénybe időt.

---
## 8. Szimuláció

### 8.1 Vezérlés (Simulator ablak)

| Gomb | Billentyű | Hatás |
|---|---|---|
| **Reset** | F9 | vissza az elejére: kezdeti példányok, üres sorok, 0 idő |
| **Step** | F10 | egy szimbólum |
| **Transition** | Shift+F10 | egy teljes átmenet |
| **Run / Pause** | F8 | folyamatos léptetés |
| **Slower / Faster** | | a lépések közti késleltetés futás közben |

Az állapotsor mutatja az időt, a lépések számát és a szimuláció állapotát (paused, running, idle, ERROR, DEADLOCK?).

### 8.2 A környezet (env)

A rendszer kívülről az **env:** soron át kap jeleket:

```
CALL to MA
GUESS(3) to GAME1
PRODUCED
```

* írd be a jelet, és nyomj **Entert** (vagy **Send**); a sor nyitva marad a következőnek
* `to …` nélkül a jel olyan példányhoz megy, amelynek van rá inputja
* a Send melletti **▾**: a korábban küldött jelek, és javaslatok azokra a jelekre, amelyeket a példányok most fogadnak
* a zöld **accepts now →** sor mutatja, melyik példány melyik jelet fogadja a jelenlegi állapotában
* az `env`-nek küldött jelek a naplóban jelennek meg (env ← …)

A példányablakok akkor jelennek meg, amikor először megnyomod a Step / Run gombot, vagy küldesz egy jelet.

### 8.3 Processzpéldány-ablakok

Minden példánynak saját ablaka van (`GAME1 : GAME`):

* felül az **állapot**, a `sender`, a `parent`, az `offspring`, a **változók** és a **sor** látható (a lila elemek lejárt timerek)
* a diagram kiemeli az **aktuális állapotot** (zöld) és a **végrehajtás alatt álló szimbólumot** (sárga)
* a leállt példány „stopped” jelzést kap; hiba esetén a hibát okozó szimbólum piros
* **Simulation / Signal animation:** minden jel kis borítékként repül a küldő output szimbólumától a fogadó sorához

### 8.4 Mi történik egy lépésben

* Egy állapotban lévő példány a **sora első olyan jelét** veszi, amely nincs save-elve:
  * ha az állapotnak van rá inputja, elindul az átmenet (a paraméterek megkapják az értékeket, beállítódik a `sender`),
  * különben a jel **eldobódik** (implicit fogyasztás, megjelenik a naplóban).
* Egy átmenet szimbólumról szimbólumra fut a lezárójáig; a többi példány csak utána folytatja.
* A példányok sorban váltják egymást (round robin).
* Ha semmi sem történhet, az idő a következő timerig ugrik. Ha timer sincs, a rendszer a környezetre vár (idle).

### 8.5 A napló és üzenetei

| Üzenet | Jelentése |
|---|---|
| env → / env ← | jel a környezettől / a környezetnek |
| X created Y | Create |
| discarded … in state … | az állapotnak nem volt inputja a jelre (és nem is save-elte) |
| lost … | a címzett már leállt |
| timer … expired | timer jel érkezett |
| ERROR … | a szimuláció megállt, pl. nem deklarált változó, nincs illeszkedő ág, ismeretlen címzett |
| DEADLOCK? … | semmi sem tud lépni, a sorokban csak save-elt jelek várnak |

Hiba után javítsd a modellt, és nyomd meg a **Reset**-et.

---
## 9. Message Sequence Chart

Az MSC ablak menet közben rajzolja a szimulációt: életvonal az env-nek és minden példánynak, nyilak a jelekhez az értékeikkel, szaggatott nyíl a Create-hez, × a Stophoz, állapotok az életvonalakon, és vonalak az időlépésekhez.

* **States:** az állapotok mutatása / elrejtése az életvonalakon
* **Follow:** görgetés a szimulációval (felfelé görgetéskor kikapcsol)
* **Export…** (a File menüben is): az MSC-t szövegként menti a **sequencediagram.org** számára
* a diagram húzással vagy görgetéssel mozgatható

---
## 10. Fájlok és példák

* **File / Save (Ctrl+S):** letölti a projektet `Név.sdl.json` néven
* **File / Open… (Ctrl+O):** megnyit egy `.sdl.json` fájlt
* **File / New project:** üres projekt
* Az aktuális projektet a böngésző is megőrzi: a program bezárása és újranyitása után is megvan.

### 10.1 Az examples mappa

Az **examples/** mappa minden `*.sdl.json` fájlja megjelenik a File menüben *Example: név* formában (fájlnév szerint rendezve, a menü a projekt nevét mutatja).

* **Példa hozzáadása:** File / Save, a fájlt másold az `examples/` mappába, aztán futtasd a `node tools/examples-index.js` parancsot (ez írja az `examples/index.json`-t, a listát, amit a program olvas). Mappalistát mutató webszerveren a **File / Reload examples** enélkül is megtalálja az új fájlt.
* **Példa elrejtése** (például vizsgán): vedd ki a fájlt a mappából. Az index.json-ban szereplő, de hiányzó fájl egyszerűen kimarad a menüből. A program a böngészőben megőrzi az utolsó projektet: vizsga előtt nyiss **New project**-et, ha az az egyik elrejtett példa volt.

A programmal együtt érkező példák:

| Fájl | Mit mutat be |
|---|---|
| 01-guessing-game | create, offspring / parent / sender, decision, stop |
| 02-ping-pong | implicit címzés, save |
| 03-handshake | a legegyszerűbb kliens–szerver üzenetváltás |
| 04-semaphore | timerek (set / reset), decision mod-dal |
| 05-dining-philosophers-deadlock | önmagának küldött jeles ciklus, pid kifejezések, save, véletlen idők, holtpont |
| 06-dining-philosophers-fixed | ugyanez a klasszikus javítással |
| 07-GuessingGame_Losers_atGuess_30sec | játékidő timerrel (30 időegység), adat lekérése a parent-től (REQ / RESP), a vesztesek számlálása |

---
## 11. Billentyűk

| Billentyű | Hatás |
|---|---|
| F1 | SDL elmélet |
| Shift+F1 | ez az útmutató |
| Ctrl+Z / Ctrl+Y | visszavonás / újra |
| Ctrl+S / Ctrl+O | mentés / megnyitás |
| F2 vagy Enter | a kijelölt szimbólum szerkesztése |
| Del | a kijelölt szimbólum törlése |
| 0, +, - | ablakhoz igazítás, nagyítás, kicsinyítés (diagramban) |
| F9 / F10 / Shift+F10 / F8 | reset / lépés / átmenet / futtatás–szünet |
| Esc | menü bezárása, szerkesztés elvetése |
| PgUp, PgDn, Home, End | az elmélet és az útmutató görgetése |

---
## 12. (Még) nem támogatott

System és block diagramok csatornákkal, join / label connectorok, procedure-ök, continuous signal-ok, enabling condition-ök, jeldeklarációk, és a teljes holtpontkeresés (állapottér-bejárás).
