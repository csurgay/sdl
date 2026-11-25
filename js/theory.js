// SDL Design Tool - "SDL Theory" window: the README as a canvas document
//
// The text is a small markdown subset, in two languages:
// SDL_THEORY (Hungarian) and SDL_THEORY_EN (English) below - keep the two in step.
//   # .. ####  headings            **bold**  *italic*  `code`  [text](url)
//   * / - / 1. lists (2 spaces = one level deeper)
//   | a | b |  tables (2nd line: |---|---|)     ``` code blocks ```     ---  rule
//   ::diagram <example> <process>   a live process diagram drawn by the tool
//   ::msc <example> <env signals separated by ;>   an MSC from a background simulation
// Links: http(s)://... opens a browser tab, open:<example> loads the example in the editor.
"use strict";

const SDL_THEORY = `
# Specification and Description Language (SDL)

## 1. Bevezetés

A **Specification and Description Language (SDL)** egy **véges automata alapú formális leíró nyelv**, amelyet a komplex, eseményvezérelt, konkurrens (párhuzamos) rendszerek egyértelmű, formálisan analizálható, vizuális modellezésére fejlesztettek ki.

Vizuálisan modellezi egy rendszer komplex struktúráját, viselkedését, és kommunikációját. A processzek viselkedése véges automatákkal definiált, amik kommunikálhatnak a környezettel, illetve egymással.

Korábban az informális leírásokban (pl. szöveges specifikációk) **nehezen ellenőrizhető hibák és félreértelmezések** lehettek. Az SDL formális alapjai lehetővé teszik a modell **szimulációját, verifikációját**, sőt **automatikus kódgenerálást** is.

Az SDL egy **CEFSM** (communicating extended finite state machine). A kommunikáción túli kiterjesztések pl. a változók használata, az elágazások az állapotátmeneteken, illetve az idő modellezése.

Az SDL-t az **ITU-T (International Telecommunication Union)** fejlesztette ki, eredetileg a **telekommunikációs protokollok** specifikációjára.

* **Első verzió:** 1976 – *Z.100 Recommendation*
* **Korszerű változat:** SDL-2010
* **Kapcsolódó ITU eszközök:**
  * **MSC (Message Sequence Charts)** – kommunikációs forgatókönyvek
  * **ASN.1** – adatleírás
  * **TTCN-3** – tesztelési nyelv

Az SDL tehát az **ITU formális modellezési ökoszisztéma** része. Ma már széles körben használják nemcsak a távközlésben, hanem **beágyazott rendszerek**, **autóipari vezérlők**, és **IoT rendszerek** tervezésénél is.

#### Főbb jellemzők:

* konkurrencia grafikus reprezentációja
* komplex rendszerekre: block hierarchia fastruktúrában
* CEFSM: egymással kommunikáló véges automaták, változók, elágazások az állapotátmeneteken, idő
* formális verifikáció, szimuláció, kódgenerálás
* széles körben használt, szabványosított
  * távközlési protokollok
  * IoT
  * biztonságkritikus rendszerek
  * autóipari vezérlők

---
## 2. Példa diagramok

#### Guessing Game – SDL Process Diagram

A **Multiple Access (MA)** processz minden **CALL** jelre létrehoz egy új **GAME** processzt, és elküldi neki a hívó azonosítóját és a játék sorszámát.

::diagram Guessing Game MA
::diagram Guessing Game GAME

#### Guessing Game – Message Sequence Chart

Két játékos hív, mindketten tippelnek: az első nyer, a második veszít. Az alábbi MSC-t a szimulátor rajzolja egy háttérben lefuttatott szimulációból:

::msc Guessing Game CALL to MA; CALL to MA; GUESS(1) to GAME1; GUESS(1) to GAME2

A **sequencediagram.org** forráskódja ugyanehhez a forgatókönyvhöz (a Simulator MSC ablakának *Export…* gombja is ilyen szöveget ment):

\`\`\`
title Guessing Game

actor Player1
actor Player2
participant "Multiple\\nAccess" as MA
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
\`\`\`

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

Az SDL modellek **diagramokból** épülnek fel. Fő típusai:

| Diagram típus | Jelentés |
|---|---|
| **System Diagram** | az egész rendszer, blokkok és csatornák |
| **Block Diagram** | egy blokk belső felépítése (folyamatok és kapcsolatok) |
| **Process Diagram** | az egyes folyamatok viselkedése (állapotgép) |

### Alap grafikus elemek:

* **State (állapot)** → a véges automata alapfogalma, egy processz mindig egy meghatározott állapotban lehet (kivéve, ha átmenetet hajt végre)
* **Input (bejövő jel)** → állapotot csak akkor hagyhatunk, ha egy Input kivált egy átmenetet
* **Output (kimenő jel)** → ennek segítségével küldenek jelet egymásnak a komponensek (processzek)
* **Decision** → feltételes elágazás, amit egy átmenet közben értékelhetünk ki
* **Task** → belső művelet vagy számítás, például értékadás változóknak

---
## 5. Példa 1 – Egyszerű kliens–szerver handshake modell SDL-ben

Képzeljünk el egy protokollt, ahol:

* a **Client** elküld egy \`HELLO\` jelet,
* a **Server** válaszol egy \`ACK\` jelzéssel,
* a Client ezt követően átmegy „Connected” állapotba.

**SDL Process Diagram – Client and Server:**

::diagram Handshake Client
::diagram Handshake Server
::msc Handshake

---
## 6. Példa 2 – Egyszerű Ping-Pong protokoll

Egy tipikus egyszerűsített **Ping-Pong** modell sender és receiver folyamata az alábbi SDL process diagramon látható.

A küldő folyamat kap egy külső kérést üzenetküldésre. A vevő ezt kézbesíti és nyugtázza a küldőnek, aki addig várakozik.

::diagram Ping Pong Sender
::diagram Ping Pong Receiver
::msc Ping Pong PRODUCED; PRODUCED

---
## 7. Kapcsolat más formális eszközökkel

Az SDL gyakran együtt használatos más ITU-T szabványokkal:

| Eszköz | Funkció | Kapcsolat SDL-lel |
|---|---|---|
| **MSC (Message Sequence Chart)** | Üzenetküldések időbeli ábrázolása | SDL processzek közti kommunikáció szemléltetése |
| **ASN.1** | Adatszerkezetek formális leírása | SDL jelek adattartalmát definiálja |
| **TTCN-3** | Tesztelési nyelv | SDL modellek automatizált tesztelése |

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
Online: [csurgay.com/sdl](https://csurgay.com/sdl)   ·   forráskód: [github.com/csurgay/sdl](https://github.com/csurgay/sdl)
`;

const SDL_THEORY_EN = `
# Specification and Description Language (SDL)

## 1. Introduction

The **Specification and Description Language (SDL)** is a **formal description language based on finite state machines**, developed for the unambiguous, formally analysable, visual modelling of complex, event-driven, concurrent (parallel) systems.

It visually models the complex structure, behaviour and communication of a system. The behaviour of the processes is defined by finite state machines, which can communicate with the environment and with each other.

Earlier, informal descriptions (e.g. textual specifications) could contain **errors and misunderstandings that were hard to detect**. The formal foundations of SDL make **simulation and verification** of the model possible, and even **automatic code generation**.

SDL is a **CEFSM** (communicating extended finite state machine). Extensions beyond communication are, for example, the use of variables, branches within transitions, and the modelling of time.

SDL was developed by the **ITU-T (International Telecommunication Union)**, originally for the specification of **telecommunication protocols**.

* **First version:** 1976 – *Z.100 Recommendation*
* **Current version:** SDL-2010
* **Related ITU tools:**
  * **MSC (Message Sequence Charts)** – communication scenarios
  * **ASN.1** – data description
  * **TTCN-3** – testing language

SDL is therefore part of the **ITU formal modelling ecosystem**. Today it is widely used not only in telecommunications, but also in the design of **embedded systems**, **automotive controllers** and **IoT systems**.

#### Main features:

* graphical representation of concurrency
* for complex systems: block hierarchy in a tree structure
* CEFSM: communicating finite state machines, variables, branches within transitions, time
* formal verification, simulation, code generation
* widely used and standardised
  * telecommunication protocols
  * IoT
  * safety-critical systems
  * automotive controllers

---
## 2. Example diagrams

#### Guessing Game – SDL Process Diagram

On every **CALL** signal the **Multiple Access (MA)** process creates a new **GAME** process and sends it the caller's identifier and the number of the game.

::diagram Guessing Game MA
::diagram Guessing Game GAME

#### Guessing Game – Message Sequence Chart

Two players call and both make a guess: the first one wins, the second one loses. The MSC below is drawn by the simulator from a simulation run in the background:

::msc Guessing Game CALL to MA; CALL to MA; GUESS(1) to GAME1; GUESS(1) to GAME2

The **sequencediagram.org** source of the same scenario (the *Export…* button of the Simulator's MSC window saves text like this, too):

\`\`\`
title Guessing Game

actor Player1
actor Player2
participant "Multiple\\nAccess" as MA
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
\`\`\`

---
## 3. Basic concepts of SDL

The main characteristics of SDL are that it is **hierarchically organised** and **graph-based**.

### Levels of the hierarchy:

1. **System** – the description of the whole system
2. **Block** – larger functional units
3. **Process** – active elements that run independently
4. **State** – the current state of a process
5. **Signal** – the messages exchanged between the processes

The system communicates by **asynchronous message passing**, i.e. the processes receive the signals through **mailboxes (input queues)**. Every process is a **state machine** (FSM):

* it is in a given **state**,
* it receives a **message**,
* it executes a **transition**, during which it **enters a new state** and **may send signals**.

This model describes the **behaviour of real-time systems** very well.

---
## 4. SDL syntax

SDL models are built from **diagrams**. The main types:

| Diagram type | Meaning |
|---|---|
| **System Diagram** | the whole system, blocks and channels |
| **Block Diagram** | the internal structure of a block (processes and connections) |
| **Process Diagram** | the behaviour of each process (state machine) |

### Basic graphical elements:

* **State** → the basic concept of the finite state machine: a process is always in a well-defined state (except while it executes a transition)
* **Input (incoming signal)** → a state can only be left when an Input triggers a transition
* **Output (outgoing signal)** → the components (processes) send signals to each other with it
* **Decision** → a conditional branch evaluated during a transition
* **Task** → an internal operation or calculation, for example assigning values to variables

---
## 5. Example 1 – A simple client–server handshake in SDL

Imagine a protocol where:

* the **Client** sends a \`HELLO\` signal,
* the **Server** answers with an \`ACK\` signal,
* after that the Client goes into the “Connected” state.

**SDL Process Diagram – Client and Server:**

::diagram Handshake Client
::diagram Handshake Server
::msc Handshake

---
## 6. Example 2 – A simple Ping-Pong protocol

The SDL process diagrams below show the sender and receiver processes of a typical simplified **Ping-Pong** model.

The sending process gets an external request to send a message. The receiver delivers it and acknowledges it to the sender, who waits until then.

::diagram Ping Pong Sender
::diagram Ping Pong Receiver
::msc Ping Pong PRODUCED; PRODUCED

---
## 7. Relation to other formal tools

SDL is often used together with other ITU-T standards:

| Tool | Function | Relation to SDL |
|---|---|---|
| **MSC (Message Sequence Chart)** | Time-ordered view of message exchanges | Illustrates the communication between SDL processes |
| **ASN.1** | Formal description of data structures | Defines the data content of SDL signals |
| **TTCN-3** | Testing language | Automated testing of SDL models |

Together they provide the **model-based development (MBD)** process.

---
## 8. Tools and practical applications

Some widely used SDL tools:

* **PragmaDev Studio** – modelling, simulation, code generation
* **Telelogic Tau / IBM Rational SDL Suite** – industrial environment
* **ObjectGEODE**, **Cinderella SDL** – for education

Applications:

* Telecommunication systems
* Embedded controllers (e.g. automotive, IoT)
* Safety-critical systems (e.g. air traffic communication)

---
Online: [csurgay.com/sdl](https://csurgay.com/sdl)   ·   source code: [github.com/csurgay/sdl](https://github.com/csurgay/sdl)
`;

// texts drawn by the layout itself
const TH_STR = {
	hu:{ title:"SDL elmélet", diagram:"SDL process diagram: ", open:"▶ megnyitás a szerkesztőben", msc:"Message Sequence Chart – ", unknown:"ismeretlen" },
	en:{ title:"SDL Theory", diagram:"SDL process diagram: ", open:"▶ open in the editor", msc:"Message Sequence Chart – ", unknown:"unknown" },
};
const SDL_THEORY_TEXT = { hu:SDL_THEORY, en:SDL_THEORY_EN };

/* ------------------------------------------------------------------ */
/* parsing                                                              */
/* ------------------------------------------------------------------ */
const TheoryDoc = {
	parse(src) {
		const lines=src.replace(/\r/g,"").split("\n");
		const blocks=[];
		let para=[];
		const flush=()=>{ if (para.length) { blocks.push({t:"p",text:para.join(" ")}); para=[]; } };
		for (let i=0;i<lines.length;i++) {
			const ln=lines[i];
			let m;
			if (/^\s*$/.test(ln)) { flush(); continue; }
			if ((m=ln.match(/^(#{1,4})\s+(.*)$/))) { flush(); blocks.push({t:"h",level:m[1].length,text:m[2]}); continue; }
			if (/^---+\s*$/.test(ln)) { flush(); blocks.push({t:"hr"}); continue; }
			if (/^```/.test(ln)) {
				flush();
				const code=[];
				for (i++;i<lines.length && !/^```/.test(lines[i]);i++) code.push(lines[i]);
				blocks.push({t:"code",text:code.join("\n")});
				continue;
			}
			if ((m=ln.match(/^::(\w+)\s*(.*)$/))) { flush(); blocks.push({t:m[1],arg:m[2].trim()}); continue; }
			if (/^\s*\|/.test(ln)) {
				flush();
				const rows=[];
				for (;i<lines.length && /^\s*\|/.test(lines[i]);i++) {
					const cells=lines[i].trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
					if (cells.every(x=>/^:?-+:?$/.test(x))) continue;
					rows.push(cells);
				}
				i--;
				blocks.push({t:"table",head:rows[0]||[],rows:rows.slice(1)});
				continue;
			}
			if ((m=ln.match(/^(\s*)([*-]|\d+\.)\s+(.*)$/))) {
				flush();
				let last=blocks[blocks.length-1];
				if (!last || last.t!=="list") { last={t:"list",items:[]}; blocks.push(last); }
				last.items.push({ level:Math.floor(m[1].length/2), ordered:/\d/.test(m[2]), num:parseInt(m[2]), text:m[3] });
				continue;
			}
			para.push(ln.trim());
		}
		flush();
		return blocks;
	},
	// "**bold** text *it* `code` [link](url)" -> runs
	inline(text) {
		const runs=[];
		const re=/\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)|(https?:\/\/[^\s)]+)/g;
		let pos=0, m;
		while ((m=re.exec(text))) {
			if (m.index>pos) runs.push({text:text.slice(pos,m.index)});
			if (m[1]!==undefined) this.inline(m[1]).forEach(r=>runs.push(Object.assign(r,{bold:true})));
			else if (m[2]!==undefined) this.inline(m[2]).forEach(r=>runs.push(Object.assign(r,{italic:true})));
			else if (m[3]!==undefined) runs.push({text:m[3],code:true});
			else if (m[4]!==undefined) runs.push({text:m[4],link:m[5]});
			else runs.push({text:m[6],link:m[6]});
			pos=re.lastIndex;
		}
		if (pos<text.length) runs.push({text:text.slice(pos)});
		return runs;
	},
};

/* ------------------------------------------------------------------ */
/* layout: blocks -> display list for a given width                     */
/* ------------------------------------------------------------------ */
const TH = {
	size:14, lineH:22, family:"Arial, Helvetica, sans-serif", mono:"Consolas, 'Courier New', monospace",
	text:"#1d2228", dim:"#6b7480", link:"#1f5fb4", head:"#1d3550", codeBg:"#eef1f5", rule:"#d3d8de",
};
function thFont(r,size=TH.size,bold=false) {
	if (r.code) return (size-1)+"px "+TH.mono;
	return (r.italic?"italic ":"")+(r.bold||bold?"bold ":"")+size+"px "+TH.family;
}

class TheoryLayout {
	constructor(blocks,width,lang="hu") {
		this.ops=[]; this.links=[]; this.heads=[];
		this.width=width;
		this.str=TH_STR[lang]||TH_STR.hu;
		let y=8;
		blocks.forEach((b,bi)=>{ y=this.block(b,y,bi); });
		this.height=y+30;
	}
	// wrap runs into lines; returns the new y
	runs(runs,x0,y,width,size=TH.size,color=TH.text,bold=false,lineH=TH.lineH) {
		let x=x0, line=[];
		const flushLine=()=>{ line.forEach(o=>{ o.y=y+lineH/2; this.ops.push(o); if (o.link) this.links.push({x:o.x,y:y,w:o.w,h:lineH,href:o.link}); }); line=[]; y+=lineH; x=x0; };
		runs.forEach(r=>{
			const font=thFont(r,size,bold);
			ctx.font=font;
			r.text.split(/(\s+)/).forEach(piece=>{
				if (piece==="") return;
				const ws=/^\s+$/.test(piece);
				if (ws && x===x0) return;
				const w=ctx.measureText(ws?" ":piece).width;
				if (!ws && x+w>x0+width && x>x0) flushLine();
				if (ws && x===x0) return;
				line.push({k:"text",x,text:ws?" ":piece,font,w,color:r.link?TH.link:color,code:!!r.code&&!ws,link:r.link||null,underline:!!r.link&&!ws});
				x+=w;
			});
		});
		if (line.length) flushLine();
		return y;
	}
	block(b,y,bi) {
		const W=this.width;
		switch (b.t) {
			case "h": {
				const size=[0,26,21,17,15][b.level];
				y+=b.level<=2?18:10;
				this.heads.push({level:b.level,text:b.text.replace(/\*\*/g,""),y:y-8});
				y=this.runs(TheoryDoc.inline(b.text),0,y,W,size,TH.head,true,Math.round(size*1.35));
				if (b.level===1) { this.ops.push({k:"rule",y:y+2,w:W,color:"#3b6ea5",lw:2}); y+=10; }
				return y+4;
			}
			case "p": return this.runs(TheoryDoc.inline(b.text),0,y+4,W)+6;
			case "hr": this.ops.push({k:"rule",y:y+12,w:W,color:TH.rule,lw:1}); return y+20;
			case "list": {
				y+=2;
				const counters=[];
				b.items.forEach(it=>{
					const ind=22+it.level*24;
					counters[it.level]=(counters[it.level]||0)+1; counters.length=it.level+1;
					const mark=it.ordered ? (it.num||counters[it.level])+"." : (it.level?"◦":"•");
					this.ops.push({k:"text",x:ind-(it.ordered?20:14),y:y+TH.lineH/2,text:mark,font:thFont({},TH.size,it.ordered),color:TH.head});
					y=this.runs(TheoryDoc.inline(it.text),ind,y,W-ind);
				});
				return y+6;
			}
			case "code": {
				const lines=b.text.split("\n"), lh=17;
				const h=lines.length*lh+16;
				this.ops.push({k:"box",x:0,y:y+4,w:W,h,fill:"#f6f8fa",stroke:"#d8dde3"});
				lines.forEach((l,i)=>this.ops.push({k:"text",x:12,y:y+12+i*lh+lh/2,text:l,font:"13px "+TH.mono,color:"#24292f"}));
				return y+h+12;
			}
			case "table": {
				const n=Math.max(b.head.length,...b.rows.map(r=>r.length));
				const nat=new Array(n).fill(40);
				[b.head,...b.rows].forEach((row,ri)=>row.forEach((cell,ci)=>{
					ctx.font=thFont({},TH.size,ri===0||/\*\*/.test(cell));
					nat[ci]=Math.max(nat[ci],ctx.measureText(cell.replace(/\*\*/g,"")).width+24);
				}));
				const sum=nat.reduce((a,b)=>a+b,0);
				const cw=nat.map(w=>sum>W?Math.max(70,w*W/sum):w);
				const tw=cw.reduce((a,b)=>a+b,0);
				y+=6;
				[b.head,...b.rows].forEach((row,ri)=>{
					// measure the row height first
					const save=this.ops.length, saveL=this.links.length;
					let x=0, hmax=0;
					const cells=[];
					for (let ci=0;ci<n;ci++) {
						const start=this.ops.length;
						const yy=this.runs(TheoryDoc.inline(row[ci]||""),x+10,y+5,cw[ci]-20,TH.size,ri?TH.text:TH.head,ri===0,20);
						cells.push(this.ops.splice(start));
						hmax=Math.max(hmax,yy-y+5);
						x+=cw[ci];
					}
					this.ops.length=save; this.links.length=saveL;
					this.ops.push({k:"box",x:0,y,w:tw,h:hmax,fill:ri===0?"#e9eef4":(ri%2?"#ffffff":"#f8f9fb"),stroke:"#cfd5dc"});
					x=0;
					for (let ci=0;ci<n;ci++) { if (ci) this.ops.push({k:"vline",x,y,h:hmax,color:"#cfd5dc"}); x+=cw[ci]; }
					cells.forEach(list=>list.forEach(o=>this.ops.push(o)));
					y+=hmax;
				});
				return y+12;
			}
			case "diagram": {
				const ex=theoryExample(b.arg);
				if (!ex) return this.runs([{text:"("+this.str.unknown+": "+b.arg+")",italic:true}],0,y,W,TH.size,"#c01818");
				const proc=ex.project.processes.find(p=>p.name.toLowerCase()===ex.rest.toLowerCase())||ex.project.processes[0];
				const lay=layoutProcess(proc);
				const scale=Math.min(1,W/lay.w);
				y+=6;
				this.ops.push({k:"diagram",x:0,y,w:lay.w*scale,h:lay.h*scale,lay,scale});
				y+=lay.h*scale+2;
				y=this.runs([{text:this.str.diagram+proc.name+"   ",italic:true},{text:this.str.open,link:"open:"+ex.name}],0,y,W,12,TH.dim,false,18);
				return y+10;
			}
			case "msc": {
				const ex=theoryExample(b.arg,true);
				if (!ex) return this.runs([{text:"("+this.str.unknown+": "+b.arg+")",italic:true}],0,y,W,TH.size,"#c01818");
				const sim=theoryRun(ex);
				const v=new MscView(()=>sim);
				v.follow=false; v.scrollY=0; v.showStates=true;
				const m=v.build();
				v.COLW=Math.max(96,Math.min(130,(W-2*v.X0)/m.cols.length));
				const w=Math.min(W,v.X0*2+m.cols.length*v.COLW), h=v.HEAD+14+(m.nrows+1)*v.ROWH;
				y+=6;
				this.ops.push({k:"msc",x:0,y,w,h,view:v});
				y+=h+2;
				y=this.runs([{text:this.str.msc+ex.name+(ex.script.length?" (env: "+ex.script.join("; ")+")   ":"   "),italic:true},{text:this.str.open,link:"open:"+ex.name}],0,y,W,12,TH.dim,false,18);
				return y+10;
			}
		}
		return y;
	}
}

// "Guessing Game MA" -> {name, project, rest}; with script: "Ping Pong PRODUCED; PRODUCED"
function theoryExample(arg,withScript=false) {
	const norm=(s)=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
	let best=null;
	BUILTIN_EXAMPLES.forEach(ex=>{
		const base=ex.name.replace(/\s*\(.*\)\s*$/,"");
		if (arg.toLowerCase().startsWith(base.toLowerCase()) && (!best || base.length>best.base.length)) best={ex,base};
	});
	if (!best) return null;
	const rest=arg.slice(best.base.length).trim();
	const project=best.ex.make();
	Model.ensureIds(project);
	return { name:best.ex.name, project, rest, script:withScript&&rest ? rest.split(";").map(s=>s.trim()).filter(s=>s) : [] };
}
// run a scenario in a private simulator (the user's simulation is not touched)
function theoryRun(ex) {
	const sim=new Simulator(ex.project);
	sim.runUntilIdle(2000);
	ex.script.forEach(cmd=>{ try { sim.envSend(cmd); } catch(e) { console.warn(e.message); } sim.runUntilIdle(2000); });
	return sim;
}

/* ------------------------------------------------------------------ */
/* the scrolling document view                                         */
/* ------------------------------------------------------------------ */
class TheoryView extends Area {
	constructor() {
		super(0,0,10,10);
		this.class="TheoryView";
		this.lang="hu";
		try { if (localStorage.getItem("sdl-theory-lang")==="en") this.lang="en"; } catch(e) {}
		this.blocks=TheoryDoc.parse(SDL_THEORY_TEXT[this.lang]);
		this.lay=null;
		this.scroll=0;
		this.PAD=26;
		this.onScroll=null;
	}
	docWidth() { return Math.max(200,Math.min(860,this.w-2*this.PAD-12)); }
	relayout() {
		const W=this.docWidth();
		if (!this.lay || this.lay.width!==W) {
			const ratio=this.lay ? this.scroll/Math.max(1,this.lay.height) : 0;
			this.lay=new TheoryLayout(this.blocks,W,this.lang);
			this.scroll=ratio*this.lay.height;
		}
		return this.lay;
	}
	maxScroll() { return Math.max(0,this.relayout().height-this.h); }
	scrollTo(y) { this.scroll=Math.max(0,Math.min(this.maxScroll(),y)); if (this.onScroll) this.onScroll(); invalidate(); }
	left() { return this.ax+Math.max(this.PAD,(this.w-12-this.docWidth())/2); }
	paint() {
		const lay=this.relayout();
		this.scroll=Math.max(0,Math.min(this.scroll,this.maxScroll()));
		c.fillRect(this.ax,this.ay,this.w,this.h,"#ffffff");
		const x0=this.left(), y0=this.ay-this.scroll;
		const top=this.scroll-60, bottom=this.scroll+this.h+60;
		ctx.save();
		ctx.translate(x0,y0);
		lay.ops.forEach(o=>{
			const oy=o.y, oh=o.h||30;
			if (oy+oh<top || oy-30>bottom) return;
			switch (o.k) {
				case "text":
					if (o.code) { ctx.fillStyle=TH.codeBg; ctx.fillRect(o.x-1,o.y-10,o.w+2,20); }
					ctx.font=o.font; ctx.fillStyle=o.color; ctx.textAlign="left"; ctx.textBaseline="middle";
					ctx.fillText(o.text,o.x,o.y+1);
					if (o.underline && WM.mouse && this.hoverLink && this.hoverLink.href===o.link) { ctx.fillRect(o.x,o.y+9,o.w,1); }
					break;
				case "rule": ctx.fillStyle=o.color; ctx.fillRect(0,o.y,o.w,o.lw); break;
				case "vline": ctx.fillStyle=o.color; ctx.fillRect(o.x,o.y,1,o.h); break;
				case "box":
					ctx.fillStyle=o.fill; ctx.fillRect(o.x,o.y,o.w,o.h);
					ctx.strokeStyle=o.stroke; ctx.lineWidth=1; ctx.strokeRect(o.x+0.5,o.y+0.5,o.w-1,o.h-1);
					break;
				case "diagram":
					ctx.save();
					ctx.beginPath(); ctx.rect(o.x,o.y,o.w,o.h); ctx.clip();
					ctx.translate(o.x,o.y); ctx.scale(o.scale,o.scale);
					paintLayout(o.lay,{});
					ctx.restore();
					break;
				case "msc": {
					const v=o.view;
					ctx.save();
					ctx.beginPath(); ctx.rect(o.x,o.y,o.w,o.h); ctx.clip();
					v.ax=o.x; v.ay=o.y; v.w=o.w; v.h=o.h; v.follow=false; v.scrollY=0;
					v.paint();
					ctx.strokeStyle="#cfd5dc"; ctx.strokeRect(o.x+0.5,o.y+0.5,o.w-1,o.h-1);
					ctx.restore();
					break;
				}
			}
		});
		ctx.restore();
		// scrollbar
		const ms=this.maxScroll();
		if (ms>0) {
			const th=Math.max(30,this.h*this.h/lay.height), ty=this.ay+(this.h-th)*this.scroll/ms;
			this.thumb={x:this.ax+this.w-10,y:ty,w:8,h:th};
			c.fillRect(this.ax+this.w-12,this.ay,12,this.h,"#f1f3f5");
			c.roundRect(this.ax+this.w-10,ty,8,th,4,"#b9c0c9",null);
		} else this.thumb=null;
	}
	linkAt(px,py) {
		const lay=this.relayout();
		const x=px-this.left(), y=py-this.ay+this.scroll;
		return lay.links.find(l=>x>=l.x && x<=l.x+l.w && y>=l.y && y<=l.y+l.h)||null;
	}
	processEvent(pevt) {
		if (pevt.type===e_wheel) { this.scrollTo(this.scroll+pevt.deltaY); return true; }
		if (pevt.type===e_move && !WM.capture) {
			const l=this.linkAt(pevt.x,pevt.y);
			if (l!==this.hoverLink) { this.hoverLink=l; invalidate(); }
			canvas.style.cursor=l?"pointer":"default";
			return true;
		}
		if (pevt.type===e_down && pevt.button===0) {
			const t=this.thumb;
			if (t && pevt.x>=this.ax+this.w-12) {      // scrollbar
				const sy=pevt.y, s0=this.scroll, k=this.maxScroll()/Math.max(1,this.h-t.h);
				if (pevt.y<t.y || pevt.y>t.y+t.h) this.scrollTo(this.scroll+(pevt.y<t.y?-1:1)*this.h*0.9);
				else WM.setCapture({ move:(e)=>this.scrollTo(s0+(e.y-sy)*k), up:()=>{} });
				return true;
			}
			const l=this.linkAt(pevt.x,pevt.y);
			if (l) { this.follow(l.href); return true; }
			const sy=pevt.y, s0=this.scroll;            // drag the page
			WM.setCapture({ cursor:"grabbing", move:(e)=>this.scrollTo(s0-(e.y-sy)), up:()=>{} });
			return true;
		}
		return false;
	}
	follow(href) {
		if (href.startsWith("open:")) {
			const name=href.slice(5);
			const ex=BUILTIN_EXAMPLES.find(e=>e.name===name);
			if (ex) WM.confirm("Open example","Replace the current project with \""+name+"\"?",()=>loadProject(ex.make()),440);
			return;
		}
		window.open(href,"_blank","noopener");
	}
	onKey(k) {
		const page=this.h*0.9;
		switch (k.key) {
			case "PageDown": case " ": this.scrollTo(this.scroll+page); return true;
			case "PageUp": this.scrollTo(this.scroll-page); return true;
			case "ArrowDown": this.scrollTo(this.scroll+40); return true;
			case "ArrowUp": this.scrollTo(this.scroll-40); return true;
			case "Home": this.scrollTo(0); return true;
			case "End": this.scrollTo(this.maxScroll()); return true;
		}
		return false;
	}
	// switch language and stay at the same section (both texts have the same headings)
	setLang(lang) {
		if (lang===this.lang || !SDL_THEORY_TEXT[lang]) return;
		const hi=this.currentHead(), old=this.relayout();
		const off=hi>=0 ? this.scroll-old.heads[hi].y : this.scroll;
		this.lang=lang;
		try { localStorage.setItem("sdl-theory-lang",lang); } catch(e) {}
		this.blocks=TheoryDoc.parse(SDL_THEORY_TEXT[lang]);
		this.lay=null;
		const lay=this.relayout();
		this.scrollTo(hi>=0 && lay.heads[hi] ? lay.heads[hi].y+Math.max(0,off) : off);
	}
	currentHead() {
		const lay=this.relayout();
		let cur=-1;
		lay.heads.forEach((h,i)=>{ if (h.level<=3 && h.y<=this.scroll+30) cur=i; });
		return cur;
	}
}

class TheoryWindow extends Window {
	constructor(prect) {
		super("SDL Theory",prect,CLOSABLE,RESIZABLE,{minW:360,minH:200});
		this.class="TheoryWindow";
		this.TOCW=220;
		this.view=this.push(new TheoryView());
		this.title=()=>TH_STR[this.view.lang].title;
		this.langBtns=[["en","English"],["hu","Magyar"]].map(([l,cap])=>this.push(new Button(cap,0,0,0,24,()=>this.setLang(l),{toggled:()=>this.view.lang===l,tooltip:l==="en"?"SDL Theory in English":"SDL elmélet magyarul"})));
		this.toc=this.push(new ListView(0,0,10,10,{
			items:()=>this.view.relayout().heads.map((h,i)=>({ text:"   ".repeat(Math.max(0,h.level-2))+h.text, data:h, font:h.level<=2?THEME.fontBold:THEME.font, color:h.level===1?THEME.titleActive:THEME.text })).filter(it=>it.data.level<=3),
			onSelect:(it)=>this.view.scrollTo(it.data.y),
			rowH:20,
		}));
		this.view.onScroll=()=>this.syncToc();
		this.layout();
	}
	setLang(l) { this.view.setLang(l); this.syncToc(); invalidate(); }
	syncToc() {
		if (!this.toc) return;
		const heads=this.view.relayout().heads.filter(h=>h.level<=3);
		const cur=this.view.relayout().heads[this.view.currentHead()];
		this.toc.selected=cur?heads.indexOf(cur):-1;
	}
	onLayout() {
		if (!this.view) return;
		const W=this.clientArea.w, H=this.clientArea.h;
		const tocW=W>760?this.TOCW:0;
		this.toc.visible=tocW>0;
		// language switch: above the contents, or in the top right corner without it
		const bw=Math.round(((tocW||200)-12)/2);
		this.langBtns.forEach((b,i)=>{ b.w=bw; b.x=tocW ? 4+i*(bw+4) : W-24-(2-i)*(bw+4); b.y=4; });
		const top=tocW?32:0;
		this.toc.set(0,top,tocW,H-top);
		this.view.set(tocW,top?0:32,W-tocW,top?H:H-32);
		if (!tocW) this.clientArea.push(this.langBtns[0]), this.clientArea.push(this.langBtns[1]);
	}
	onKey(k) { return this.view.onKey(k); }
}

var theoryWindow=null;
function showTheory(lang) {
	if (!theoryWindow) {
		const ca=WM.root.clientArea;
		const w=Math.min(1120,ca.w-60), h=ca.h-40;
		theoryWindow=new TheoryWindow(new Rect(Math.round((ca.w-w)/2),20,w,h));
		ca.push(theoryWindow);
	}
	if (lang) theoryWindow.setLang(lang);
	theoryWindow.show();
	theoryWindow.syncToc();
}
