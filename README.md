### **Specification and Description Language (SDL)**

---

## 1. Bevezetés

A **Specification and Description Language (SDL)** egy **formális leíró nyelv**, amelyet a **bonyolult, eseményvezérelt, párhuzamos rendszerek** modellezésére fejlesztettek ki.
Legfőbb célja, hogy **egyértelmű, vizuálisan is áttekinthető módon** írja le egy rendszer viselkedését, kommunikációját és struktúráját — ezáltal kiküszöbölve a félreértéseket, amelyek gyakran adódnak a természetes nyelvű követelményekből.

A fejlesztés fő indoka az volt, hogy az informális leírásokból (pl. szöveges specifikációk) **könnyen származhatnak hibák és értelmezési eltérések**. Az SDL formális alapjai lehetővé teszik a modell **szimulációját, verifikációját**, sőt gyakran **automatikus kódgenerálást** is.

---

## 2. Történeti háttér és szerepe

Az SDL-t az **ITU-T (International Telecommunication Union – Telecommunication Standardization Sector)** fejlesztette ki, eredetileg a **telekommunikációs protokollok** specifikációjára.

* **Első verzió:** 1976 – *Z.100 Recommendation*
* **Korszerű változat:** SDL-2010
* **Kapcsolódó ITU eszközök:**

  * **MSC (Message Sequence Charts)** – kommunikációs forgatókönyvek
  * **ASN.1** – adatleírás
  * **TTCN-3** – tesztelési nyelv

Az SDL tehát az **ITU formális modellezési ökoszisztéma** része. Ma már széles körben használják nemcsak a távközlésben, hanem **beágyazott rendszerek**, **autóipari vezérlők**, és **IoT rendszerek** tervezésénél is.

---

## 3. Az SDL alapfogalmai

Az SDL fő jellemzője, hogy **hierarchikusan szervezett** és **gráf-alapú**.

### A hierarchia szintjei:

1. **System** – a teljes rendszer leírása
2. **Block** – nagyobb funkcionális egységek
3. **Process** – aktív elemek, amelyek önállóan futnak
4. **State** – a folyamat aktuális állapota
5. **Signal** – az üzenetek, amelyek a folyamatok között cserélődnek

A rendszer **aszinkron üzenetküldéssel** kommunikál, azaz a folyamatok **üzenetdobozokon (input queue)** keresztül kapják a jeleket. Minden folyamat **állapotgép**:

* adott **állapotban** van,
* **üzenetet** kap,
* végrehajt egy **átmenetet**, amely során **új állapotba lép** és **jelet küldhet ki**.

Ez a modell kiválóan leírja a **valós idejű rendszerek viselkedését**.

---

## 4. Az SDL szintaxis és grafikus elemei

Az SDL modellek **diagramokból** épülnek fel.
Fő típusai:

| Diagram típus       | Jelentés                                               |
| ------------------- | ------------------------------------------------------ |
| **System Diagram**  | az egész rendszer, blokkok és csatornák                |
| **Block Diagram**   | egy blokk belső felépítése (folyamatok és kapcsolatok) |
| **Process Diagram** | az egyes folyamatok viselkedése (állapotgép)           |

### Alap grafikus elemek:

* **Input (bejövő jel)** → nyíl, amely a folyamatba lép
* **Output (kimenő jel)** → nyíl, amely a folyamatból indul
* **State (állapot)** → téglalap vagy ovális alak
* **Decision** → feltételes elágazás
* **Task** → belső művelet vagy számítás

---

## 5. Példa 1 – Egyszerű kliens–szerver handshake modell SDL-ben

Képzeljünk el egy protokollt, ahol:

* a **Client** elküld egy `HELLO` jelet,
* a **Server** válaszol egy `ACK` jelzéssel,
* a Client ezt követően átmegy „Connected” állapotba.

**SDL Process Diagram – Client:**

```plaintext
Start
 |
 v
Idle
 | input start
 v
send(HELLO) / output HELLO
 |
 v
Wait_ACK
 | input ACK
 v
Connected
```

**SDL Process Diagram – Server:**

```plaintext
Start
 |
 v
Idle
 | input HELLO
 v
send(ACK) / output ACK
 |
 v
Connected
```

---

## 6. Példa 2 – Valós idejű híváskezelő folyamat

Egy tipikus **telefónia modell** SDL-ben három állapotot tartalmazhat:

1. **Idle** – a vonal szabad
2. **Ringing** – hívás bejövőben
3. **Connected** – hívás aktív

**Események:**

* `CALL_REQ` – hívás érkezik
* `ACCEPT` – felhasználó felveszi
* `HANGUP` – hívás befejezése

**SDL Process Diagram – CallHandler:**

```plaintext
Start
 |
 v
Idle
 | input CALL_REQ
 v
send(RING) / output RING
 |
 v
Ringing
 | input ACCEPT
 v
send(CONNECT) / output CONNECT
 |
 v
Connected
 | input HANGUP
 v
send(RELEASE) / output RELEASE
 |
 v
Idle
```

E modell könnyen bővíthető új funkciókkal (pl. időzítés, timeout, foglalt állapot), és **szimulálható** különböző eszközökben, például *PragmaDev Studio* vagy *Telelogic Tau* környezetben.

---

## 7. Kapcsolat más formális eszközökkel

Az SDL gyakran együtt használatos más ITU-T szabványokkal:

| Eszköz                           | Funkció                            | Kapcsolat SDL-lel                                           |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| **MSC (Message Sequence Chart)** | Üzenetküldési sorrendek ábrázolása | SDL folyamatok kommunikációjának szemléltetése              |
| **ASN.1**                        | Adatszerkezetek formális leírása   | SDL jelek adattartalmát definiálja                          |
| **TTCN-3**                       | Tesztelési nyelv                   | SDL modellekből generált rendszerek automatizált tesztelése |

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

Az SDL egy **erőteljes formális nyelv**, amely vizuális, állapotgép-alapú és jól skálázható.
Lehetővé teszi:

* komplex rendszerek **egyértelmű specifikációját**,
* **szimulációt** és **formális ellenőrzést**,
* **automatikus kódgenerálást**,
* valamint **konzisztens dokumentációt** a fejlesztés teljes életciklusa során.

Főként az **5G**, **IoT**, **valós idejű és biztonságkritikus rendszerek** fejlesztésében releváns.

