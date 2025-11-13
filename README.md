# **Specification and Description Language (SDL)**

## 1. Bevezetés

A **Specification and Description Language (SDL)** egy **véges automata alapú formális leíró nyelv**, amelyet a komplex, eseményvezérelt, párhuzamos rendszerek egyértelmű, formálisan analizálható, vizuális modellezésére fejlesztettek ki.

Vizuálisan modellezi egy rendszer komplex struktúráját, viselkedését, és kommunikációját. A processzek viselkedése véges automatákkal definiált, amik kommunikálhatnak a környezettel, illetve egymással.

Korábban az informális leírásokban (pl. szöveges specifikációk) **nehezen ellenőrizhető hibák és féreértelmezések** lehettek. Az SDL formális alapjai lehetővé teszik a modell **szimulációját, verifikációját**, sőt **automatikus kódgenerálást** is.

Az SDL egy **CEFSM** (communicating extended finite state machine). A kommunikáción túli kiterjesztések pl. a változók használata, az elágazások az állapotátmeneteken, illetve az idő modellezése.

Az SDL-t az **ITU-T (International Telecommunication Union)** fejlesztette ki, eredetileg a **telekommunikációs protokollok** specifikációjára.

* **Első verzió:** 1976 – *Z.100 Recommendation*
* **Korszerű változat:** SDL-2010
* **Kapcsolódó ITU eszközök:**

  * **MSC (Message Sequence Charts)** – kommunikációs forgatókönyvek
  * **ASN.1** – adatleírás
  * **TTCN-3** – tesztelési nyelv

Az SDL tehát az **ITU formális modellezési ökoszisztéma** része. Ma már széles körben használják nemcsak a távközlésben, hanem **beágyazott rendszerek**, **autóipari vezérlők**, és **IoT rendszerek** tervezésénél is.

---
## 2. Példa diagrammok

#### Guessing Game - Message Sequence Chart
<table border="0">
 <tr>
    <td><strong>sequencediagram.org MSC</strong></td>
    <td><strong>sequencediagram.org forráskód</strong></td>
 </tr>
 <tr>
    <td><img width="426" height="901" alt="image" src="https://github.com/user-attachments/assets/5a2798e0-7928-4b0c-8826-78cc48df2859" /></td>
    <td><pre>
title Guessing Game

actor Player1
actor Player2
participant "Multiple\nAccess" as MA
rparticipant Game1
rparticipant Game2

Player1->(1)MA:CALL
MA-->(1)*Game1:CREATE
MA->(1)Game1:INIT(caller,n)
Player2->(1)MA:CALL
MA-->(1)*Game2:CREATE
MA->(1)Game2:INIT(caller,n)
Game1->(1)Player1:PROMPT
Game2->(1)Player2:PROMPT
Player1->(1)Game1:GUESS(m)
Game1->(1)Player1:WIN
destroyafter Game1
Player2->(1)Game2:GUESS(m)
Game2->(1)Player2:LOSE
destroyafter Game2
</pre></td>
 </tr>
</table>

---
## 3. Az SDL alapfogalmai

Az SDL fő jellemzője, hogy **hierarchikusan szervezett** és **gráf-alapú**.

### A hierarchia szintjei:

1. **System** – a teljes rendszer leírása
2. **Block** – nagyobb funkcionális egységek
3. **Process** – aktív elemek, amelyek önállóan futnak
4. **State** – a folyamat aktuális állapota
5. **Signal** – az üzenetek, amelyek a folyamatok között cserélődnek

A rendszer **aszinkron üzenetküldéssel** kommunikál, azaz a folyamatok **postaládákon (input queue)** keresztül kapják a jeleket. Minden folyamat **állapotgép** (FSM):

* adott **állapotban** van,
* **üzenetet** kap,
* végrehajt egy **átmenetet**, amely során **új állapotba lép** és **jelet küldhet ki**.

Ez a modell kiválóan leírja a **valós idejű rendszerek viselkedését**.

---
## 4. Az SDL szintaxis

Az SDL modellek **diagramokból** épülnek fel.
Fő típusai:

| Diagram típus       | Jelentés                                               |
| ------------------- | ------------------------------------------------------ |
| **System Diagram**  | az egész rendszer, blokkok és csatornák                |
| **Block Diagram**   | egy blokk belső felépítése (folyamatok és kapcsolatok) |
| **Process Diagram** | az egyes folyamatok viselkedése (állapotgép)           |

### Alap grafikus elemek:

* **State (állapot)** → a véges automata alapfogalma, egy processz mindig egy meghatározott állapotban lehet (kivéve, ha átmenetet hajt végre)
* **Input (bejövő jel)** → állapotot csak akkor hagyhatunk, ha egy Input kivált egy átmenetet
* **Output (kimenő jel)** → ennek segítségével lüldenek jelet egymásnak a komponensek (processzek)
* **Decision** → feltételes elágazás, amit egy átmenet közben értékelhetünk ki
* **Task** → belső művelet vagy számítás, például értékadás változóknak

---
## 5. Példa 1 – Egyszerű kliens–szerver handshake modell SDL-ben

Képzeljünk el egy protokollt, ahol:

* a **Client** elküld egy `HELLO` jelet,
* a **Server** válaszol egy `ACK` jelzéssel,
* a Client ezt követően átmegy „Connected” állapotba.

**SDL Process Diagram – Client and Server:**

<img width="405" height="662" alt="image" src="https://github.com/user-attachments/assets/95016d25-a2de-421a-8380-9b3967ca9d82" />

---
## 6. Példa 2 – Valós idejű híváskezelő folyamat

Egy tipikus egyszerűsített **kimenő telefonhívás modell** SDL-ben három állapotot tartalmazhat:

1. **Idle** – a vonal szabad
2. **Ringing** – hívás bejövőben
3. **Connected** – hívás aktív

**Események:**

* `call_req` – hívás érkezik
* `accept` – felhasználó felveszi
* `hangup` – hívás befejezése

**SDL Process Diagram – CallHandler:**

<img width="491" height="497" alt="image" src="https://github.com/user-attachments/assets/d95a5f39-1834-4585-b3cb-c4dcb4c9abf0" />

E modell könnyen bővíthető új funkciókkal (pl. időzítés, timeout, foglalt állapot), és **szimulálható** különböző SDL eszközökben.

---
## 7. Kapcsolat más formális eszközökkel

Az SDL gyakran együtt használatos más ITU-T szabványokkal:

| Eszköz                           | Funkció                            | Kapcsolat SDL-lel                                           |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| **MSC (Message Sequence Chart)** | Üzenetküldések időbeli ábrázolása | SDL processzek közti kommunikáció szemléltetése              |
| **ASN.1**                        | Adatszerkezetek formális leírása   | SDL jelek adattartalmát definiálja                          |
| **TTCN-3**                       | Tesztelési nyelv                   | SDL modellek automatizált tesztelése |

Ezek együtt biztosítják a **model-based development (MBD)** folyamatot.

---
## 8. Eszközök és gyakorlati alkalmazások

Néhány elterjedt SDL-eszköz:

* **PragmaDev Studio** – modellezés, szimuláció, kódgenerálás
* **Telelogic Tau / IBM Rational SDL Suite** – ipari környezet
* **ObjectGEODE**, **Cinderella SDL** – oktatási célokra

Felhasználás:

* Telekommunikációs rendszerek
* Beágyazott vezérlők (pl. autóipar, IoT)
* Biztonságkritikus rendszerek (pl. légiforgalmi kommunikáció)

---
## 9. Összefoglalás

Az SDL egy **szabványos formális nyelv**, amely vizuális, állapotgép-alapú és jól skálázható.

* komplex rendszerek **egyértelmű specifikációja**
* **szimuláció** és **formális ellenőrzés**
* **automatikus kódgenerálás**
* **konzisztens dokumentáció** a fejlesztés teljes életciklusa során
* pl. **IoT**, **valós idejű és biztonságkritikus rendszerek**, **autóipari vezérlők** fejlesztésében

