// SDL Design Tool - SDL-88 process model, editing operations, undo, examples
//
// project = { format, name, processes:[process] }
// process = { id, name, init, dcl, start:{id, trans}, states:[state] }
// state   = { id, name, inputs:[ {id, type:"input"|"save", text, trans} ] }
// trans   = { actions:[node], term }   term = {id, type:"nextstate"|"stop", text} | null
// node    = { id, type:"task"|"output"|"create"|"decision", text, branches? }
// branch  = { id, answer, trans }      (a decision is always the last action of its list;
//                                       the branches carry the terminators)
"use strict";

const Model = {
	project:null,
	version:0,
	listeners:[],
	undoStack:[], redoStack:[],
	nextId:1,
	uid() { return "n"+(this.nextId++); },

	load(pproject,keepHistory=false) {
		this.project=pproject;
		this.ensureIds(pproject);
		if (!keepHistory) { this.undoStack=[]; this.redoStack=[]; }
		this.changed("load");
	},
	toJSON() { return JSON.stringify(this.project,null,1); },
	fromJSON(s) {
		const p=JSON.parse(s);
		if (!p || !Array.isArray(p.processes)) throw new Error("not an SDL project file");
		return p;
	},
	changed(what) {
		this.version++;
		this.listeners.forEach(f=>{ try { f(what); } catch(e) { console.error(e); } });
		try { localStorage.setItem("sdl-tool-project",this.toJSON()); } catch(e) {}
	},
	// every modification goes through edit() => undo works everywhere
	edit(label,fn) {
		const before=JSON.stringify(this.project);
		let r;
		try { r=fn(); }
		catch(e) { this.project=JSON.parse(before); this.changed("error"); throw e; }
		if (r===false) return false;
		this.undoStack.push(before);
		if (this.undoStack.length>200) this.undoStack.shift();
		this.redoStack=[];
		this.ensureIds(this.project);
		this.changed(label);
		return r;
	},
	undo() {
		if (!this.undoStack.length) return false;
		this.redoStack.push(JSON.stringify(this.project));
		this.project=JSON.parse(this.undoStack.pop());
		this.changed("undo");
		return true;
	},
	redo() {
		if (!this.redoStack.length) return false;
		this.undoStack.push(JSON.stringify(this.project));
		this.project=JSON.parse(this.redoStack.pop());
		this.changed("redo");
		return true;
	},

	ensureIds(p) {
		const seen=new Set();
		const fix=(o)=>{
			if (!o) return;
			if (o.id && !seen.has(o.id)) { const k=parseInt(String(o.id).slice(1)); if (k>=this.nextId) this.nextId=k+1; }
		};
		const assign=(o)=>{
			if (!o) return;
			if (!o.id || seen.has(o.id)) o.id=this.uid();
			seen.add(o.id);
		};
		const walkTrans=(t,f)=>{
			if (!t) return;
			t.actions=t.actions||[];
			t.actions.forEach(a=>{ f(a); (a.branches||[]).forEach(b=>{ f(b); b.trans=b.trans||{actions:[],term:null}; walkTrans(b.trans,f); }); });
			if (t.term) f(t.term);
		};
		const walk=(f)=>{
			p.processes.forEach(pr=>{
				f(pr);
				pr.start=pr.start||{trans:{actions:[],term:{type:"nextstate",text:"Idle"}}};
				f(pr.start); walkTrans(pr.start.trans,f);
				pr.states=pr.states||[];
				pr.states.forEach(s=>{ f(s); s.inputs=s.inputs||[]; s.inputs.forEach(i=>{ f(i); if (i.type!=="save") { i.trans=i.trans||{actions:[],term:{type:"nextstate",text:"-"}}; walkTrans(i.trans,f); } }); });
			});
		};
		walk(fix); walk(assign);
		p.processes.forEach(pr=>{ if (pr.init===undefined) pr.init=1; if (pr.dcl===undefined) pr.dcl=""; });
	},

	/* ---------------- queries ---------------- */
	findProc(name) {
		const n=String(name).toLowerCase();
		return this.project.processes.find(p=>p.name.toLowerCase()===n)||null;
	},
	findState(proc,name) {
		const n=String(name).toLowerCase();
		return proc.states.find(s=>s.name.toLowerCase()===n)||null;
	},
	// all node objects of a process by id
	index(proc) {
		const m=new Map();
		const walkTrans=(t)=>{ if (!t) return; t.actions.forEach(a=>{ m.set(a.id,a); (a.branches||[]).forEach(b=>{ m.set(b.id,b); walkTrans(b.trans); }); }); if (t.term) m.set(t.term.id,t.term); };
		m.set(proc.start.id,proc.start); walkTrans(proc.start.trans);
		proc.states.forEach(s=>{ m.set(s.id,s); s.inputs.forEach(i=>{ m.set(i.id,i); walkTrans(i.trans); }); });
		return m;
	},

	/* ---------------- editing (refs come from the layout) ----------------
	   ref.kind: "start" | "dcl" | "state" | "input" | "action" | "term" | "branch"   */
	defaultText(type) {
		return { task:"x := 0", output:"SIG to sender", create:"Process", decision:"x = 0 ?",
			input:"SIG", save:"SIG", state:"State", timer:"set(now+5, T)", stop:"", nextstate:"-" }[type]||"";
	},
	transOf(ref) {
		if (ref.kind==="start") return ref.proc.start.trans;
		if (ref.kind==="input") return ref.state.inputs[ref.index].trans||null;
		if (ref.kind==="branch") return ref.decision.branches[ref.index].trans;
		if (ref.kind==="action"||ref.kind==="term") return ref.trans;
		return null;
	},
	// where would a new action land: {trans, index} or null
	insertPoint(ref) {
		if (ref.kind==="action") {
			const a=ref.trans.actions[ref.index];
			if (a.type==="decision") return { trans:a.branches[0].trans, index:0 };
			return { trans:ref.trans, index:ref.index+1 };
		}
		if (ref.kind==="term") return ref.trans.term ? { trans:ref.trans, index:ref.trans.actions.length } : null;
		const t=this.transOf(ref);
		return t ? { trans:t, index:0 } : null;
	},
	canInsert(ref,type) {
		if (["task","output","create","decision","timer"].includes(type)) return !!this.insertPoint(ref);
		if (type==="input"||type==="save") return ref.kind==="state"||ref.kind==="input";
		if (type==="state") return true;
		if (type==="stop") return ref.kind==="term";
		return false;
	},
	newNode(type,text) {
		const t=type==="timer"?"task":type;
		const n={ id:this.uid(), type:t, text:text!==undefined?text:this.defaultText(type) };
		return n;
	},
	insertAction(ref,type,text) {
		const ip=this.insertPoint(ref);
		if (!ip) return null;
		const n=this.newNode(type,text);
		const t=ip.trans;
		if (n.type==="decision") {
			const rest=t.actions.splice(ip.index);
			n.branches=[
				{ id:this.uid(), answer:"true", trans:{ actions:rest, term:t.term } },
				{ id:this.uid(), answer:"false", trans:{ actions:[], term:{ id:this.uid(), type:"nextstate", text:"-" } } },
			];
			t.actions.push(n);
			t.term=null;
		}
		else t.actions.splice(ip.index,0,n);
		return n;
	},
	addState(proc,name) {
		let nm=name||"State", k=2;
		while (this.findState(proc,nm)) nm=(name||"State")+k++;
		const s={ id:this.uid(), name:nm, inputs:[] };
		proc.states.push(s);
		return s;
	},
	addInput(proc,state,type="input",text,afterIndex) {
		const i={ id:this.uid(), type, text:text!==undefined?text:this.defaultText(type) };
		if (type==="input") i.trans={ actions:[], term:{ id:this.uid(), type:"nextstate", text:"-" } };
		if (afterIndex===undefined) state.inputs.push(i); else state.inputs.splice(afterIndex+1,0,i);
		return i;
	},
	deleteRef(ref) {
		switch (ref.kind) {
			case "action": {
				const a=ref.trans.actions[ref.index];
				if (a.type==="decision") {
					const b0=a.branches[0].trans;
					ref.trans.actions.splice(ref.index,1,...b0.actions);
					ref.trans.term=b0.term;
				}
				else ref.trans.actions.splice(ref.index,1);
				return true;
			}
			case "input": ref.state.inputs.splice(ref.index,1); return true;
			case "state": ref.proc.states.splice(ref.proc.states.indexOf(ref.state),1); return true;
			case "branch": {
				if (ref.decision.branches.length<=2) return false;
				ref.decision.branches.splice(ref.index,1); return true;
			}
		}
		return false;
	},
	canDelete(ref) {
		if (ref.kind==="branch") return ref.decision.branches.length>2;
		return ["action","input","state"].includes(ref.kind);
	},
	getText(ref) {
		switch (ref.kind) {
			case "start": return "";
			case "dcl": return ref.proc.dcl;
			case "state": return ref.state.name;
			case "input": return ref.state.inputs[ref.index].text;
			case "action": return ref.trans.actions[ref.index].text;
			case "term": return ref.trans.term.type==="stop" ? "" : ref.trans.term.text;
			case "branch": return ref.decision.branches[ref.index].answer;
		}
		return "";
	},
	canEditText(ref) { return !(ref.kind==="start" || (ref.kind==="term" && ref.trans.term.type==="stop")); },
	setText(ref,text) {
		text=String(text).trim();
		switch (ref.kind) {
			case "dcl": ref.proc.dcl=text; break;
			case "state": {
				if (text==="" ) return false;
				const old=ref.state.name;
				if (this.findState(ref.proc,text) && text.toLowerCase()!==old.toLowerCase()) throw new SdlError("state '"+text+"' already exists");
				ref.state.name=text;
				this.eachTerm(ref.proc,(t)=>{ if (t.type==="nextstate" && t.text.toLowerCase()===old.toLowerCase()) t.text=text; });
				break;
			}
			case "input": ref.state.inputs[ref.index].text=text; break;
			case "action": ref.trans.actions[ref.index].text=text; break;
			case "term":
				if (text==="") text="-";
				ref.trans.term.text=text;
				if (text!=="-" && !this.findState(ref.proc,text)) this.addState(ref.proc,text);
				break;
			case "branch": ref.decision.branches[ref.index].answer=text; break;
			default: return false;
		}
		return true;
	},
	setTerm(ref,type) {
		const t=ref.trans.term;
		if (!t) return false;
		t.type=type;
		if (type==="nextstate" && (!t.text)) t.text="-";
		return true;
	},
	addBranch(ref) {
		const d=ref.trans.actions[ref.index];
		d.branches.push({ id:this.uid(), answer:"else", trans:{ actions:[], term:{ id:this.uid(), type:"nextstate", text:"-" } } });
		return true;
	},
	eachTerm(proc,f) {
		const walk=(t)=>{ if (!t) return; t.actions.forEach(a=>(a.branches||[]).forEach(b=>walk(b.trans))); if (t.term) f(t.term); };
		walk(proc.start.trans);
		proc.states.forEach(s=>s.inputs.forEach(i=>walk(i.trans)));
	},
	newProcess(name) {
		let nm=name||"Process", k=2;
		while (this.findProc(nm)) nm=(name||"Process")+k++;
		const p={ id:this.uid(), name:nm, init:1, dcl:"",
			start:{ id:this.uid(), trans:{ actions:[], term:{ id:this.uid(), type:"nextstate", text:"Idle" } } },
			states:[{ id:this.uid(), name:"Idle", inputs:[] }] };
		this.project.processes.push(p);
		return p;
	},
};

/* ------------------------------------------------------------------ */
/* examples, written with a tiny builder                               */
/* ------------------------------------------------------------------ */
const SdlBuild = {
	T:(text)=>({type:"task",text}),
	O:(text)=>({type:"output",text}),
	C:(text)=>({type:"create",text}),
	D:(text,branches)=>({type:"decision",text,branches:Object.keys(branches).map(k=>({answer:k,trans:SdlBuild.trans(branches[k])}))}),
	N:(text)=>({term:true,type:"nextstate",text}),
	S:()=>({term:true,type:"stop",text:""}),
	trans(list) {
		const t={ actions:[], term:null };
		list.forEach(x=>{ if (x.term) t.term={type:x.type,text:x.text}; else t.actions.push(x); });
		if (!t.term && !(t.actions.length && t.actions[t.actions.length-1].type==="decision")) t.term={type:"nextstate",text:"-"};
		return t;
	},
	proc(name,init,dcl,start,states) {
		return { name, init, dcl, start:{trans:this.trans(start)},
			states:Object.keys(states).map(sn=>({ name:sn, inputs:states[sn].map(i=>
				i.save ? {type:"save",text:i.save} : {type:"input",text:i.input,trans:this.trans(i.steps)}) })) };
	},
};

function exampleGuessingGame() {
	const {T,O,C,D,N,S}=SdlBuild;
	return { format:"sdl-tool/1", name:"Guessing Game", processes:[
		SdlBuild.proc("MA",1,"n",[T("n := 0"),N("IDLE")],{
			IDLE:[{input:"CALL",steps:[C("GAME"),T("n++"),O("INIT(sender, n)\nto offspring"),N("IDLE")]}],
		}),
		SdlBuild.proc("GAME",0,"player, n, m",[N("IDLE")],{
			IDLE:[{input:"INIT(player, n)",steps:[O("PROMPT\nto player"),N("WAIT")]}],
			WAIT:[{input:"GUESS(m)",steps:[D("n = m ?",{
				"true":[O("WINNER\nto player"),S()],
				"false":[O("LOSER\nto player"),S()],
			})]}],
		}),
	]};
}
function examplePingPong() {
	const {T,O,N}=SdlBuild;
	return { format:"sdl-tool/1", name:"Ping Pong", processes:[
		SdlBuild.proc("Sender",1,"count",[T("count := 0"),N("READY")],{
			READY:[{input:"PRODUCED",steps:[T("count++"),O("MSG(count)"),N("WAIT_ACK")]}],
			WAIT_ACK:[{input:"ACK",steps:[N("READY")]}, {save:"PRODUCED"}],
		}),
		SdlBuild.proc("Receiver",1,"k",[N("READY2")],{
			READY2:[{input:"MSG(k)",steps:[O("OUTPUT(k)\nto env"),O("ACK\nto sender"),N("READY2")]}],
		}),
	]};
}
function exampleSemaphore() {
	const {T,O,D,N}=SdlBuild;
	return { format:"sdl-tool/1", name:"Semaphore", processes:[
		SdlBuild.proc("Semaphore",1,"n",[T("n := 0"),N("Tilos")],{
			Tilos:[
				{input:"Nami",steps:[O("Tilos\nto sender"),N("-")]},
				{input:"Kurbli",steps:[T("set(now+10, Lejart)"),N("Szabad")]},
			],
			Szabad:[
				{input:"Nami",steps:[O("Szabad\nto sender"),N("-")]},
				{input:"Vonat",steps:[T("n++; reset(Lejart)"),D("n mod 3 = 0 ?",{
					"true":[O("Csengo\nto Bakter"),N("Tilos")],
					"false":[N("Tilos")],
				})]},
				{input:"Lejart",steps:[N("Tilos")]},
			],
		}),
		SdlBuild.proc("Bakter",1,"csengetes",[T("csengetes := 0"),N("Alszik")],{
			Alszik:[{input:"Csengo",steps:[T("csengetes++"),O("Kurbli\nto Semaphore"),N("-")]}],
		}),
	]};
}
// Dijkstra's dining philosophers. Asztal creates n forks (Villa) and n philosophers (Filozof)
// with a self-signal loop. Every philosopher takes the left fork first, then the right one.
// fixed=false: everybody gets hungry at t=1 -> all hold their left fork -> DEADLOCK
// fixed=true:  the last philosopher takes the forks in reverse order -> runs forever
function exampleDiningPhilosophers(fixed=false) {
	const {T,O,C,D,N}=SdlBuild;
	const init=[T("bal := 'Villa' + en;\njobb := 'Villa' + (en mod n + 1);\netkezes := 0")];
	if (fixed) init.push(D("en = n ?",{
		"true":[T("tmp := bal; bal := jobb; jobb := tmp"),T("set(now+1, EHES)"),N("Gondolkodik")],
		"false":[T("set(now+1, EHES)"),N("Gondolkodik")],
	}));
	else init.push(T("set(now+1, EHES)"),N("Gondolkodik"));
	return { format:"sdl-tool/1", name:"Dining Philosophers"+(fixed?" (fixed)":" (deadlock)"), processes:[
		SdlBuild.proc("Asztal",1,"i, n := 5",[T("i := 0"),O("KOVETKEZO to self"),N("Teritek")],{
			Teritek:[{input:"KOVETKEZO",steps:[T("i++"),C("Villa"),C("Filozof"),O("INIT(i, n)\nto offspring"),
				D("i < n ?",{"true":[O("KOVETKEZO to self"),N("-")],"false":[N("Vacsora")]})]}],
			Vacsora:[],
		}),
		SdlBuild.proc("Filozof",0,"en, n, bal, jobb, etkezes, tmp",[N("Ul")],{
			Ul:[{input:"INIT(en, n)",steps:init}],
			Gondolkodik:[{input:"EHES",steps:[O("KER to bal"),N("VarBal")]}],
			VarBal:[{input:"KAPOD",steps:[O("KER to jobb"),N("VarJobb")]}],
			VarJobb:[{input:"KAPOD",steps:[T("etkezes++;\nset(now+random(2,4), JOLLAKOTT)"),N("Eszik")]}],
			Eszik:[{input:"JOLLAKOTT",steps:[O("VISSZA to bal"),O("VISSZA to jobb"),T("set(now+random(1,5), EHES)"),N("Gondolkodik")]}],
		}),
		SdlBuild.proc("Villa",0,"",[N("Szabad")],{
			Szabad:[{input:"KER",steps:[O("KAPOD to sender"),N("Foglalt")]}],
			Foglalt:[{input:"VISSZA",steps:[N("Szabad")]},{save:"KER"}],
		}),
	]};
}
const EXAMPLES = [
	{ name:"Dining Philosophers (deadlock)", make:()=>exampleDiningPhilosophers(false) },
	{ name:"Dining Philosophers (fixed)", make:()=>exampleDiningPhilosophers(true) },
	{ name:"Guessing Game", make:exampleGuessingGame },
	{ name:"Ping Pong", make:examplePingPong },
	{ name:"Semaphore (timer)", make:exampleSemaphore },
];

if (typeof module!=="undefined") module.exports={ Model, SdlBuild, EXAMPLES, exampleGuessingGame, examplePingPong, exampleSemaphore };
