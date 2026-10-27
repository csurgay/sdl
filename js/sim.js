// SDL Design Tool - SDL-88 simulator core (UI independent, runs in node too)
//
// Semantics (simplified SDL-88):
//  - every process instance has an input queue; a transition runs to its end (one symbol per step)
//  - in a state the first queued signal that is not SAVEd is taken: if the state has an input
//    for it the transition starts, otherwise it is discarded (implicit consumption)
//  - output: explicit "to <pid expression>", or implicit routing to an instance that has
//    an input for that signal, otherwise to the environment ("env")
//  - create sets offspring / parent, stop terminates the instance
//  - timers: set(now+d, T) / reset(T); time advances only when nothing else can run
//  - pid expressions: self, sender, parent, offspring, env, an instance name (Game1)
//    or a process name (GAME -> its first living instance)
"use strict";

class Simulator {
	constructor(project) {
		this.project=project;
		this.listeners=[];
		this.reset(project);
	}
	on(f) { this.listeners.push(f); }
	emit(ev) {
		ev.time=this.now; ev.seq=this.seq++;
		this.trace.push(ev);
		this.listeners.forEach(f=>{ try { f(ev,this); } catch(e) { console.error(e); } });
		return ev;
	}
	reset(project) {
		if (project) this.project=project;
		this.instances=[];
		this.counters={};
		this.now=0;
		this.timers=[];
		this.trace=[];
		this.seq=0;
		this.rr=0;
		this.error=null;
		this.steps=0;
		this.emit({type:"reset"});
		try {
			this.project.processes.forEach(p=>{ for (let k=0;k<(parseInt(p.init)||0);k++) this.spawn(p,null); });
		} catch(e) { this.fail(e,null,null); }
	}
	/* ---------------- instances ---------------- */
	spawn(proc,parent) {
		this.counters[proc.name]=(this.counters[proc.name]||0)+1;
		const inst={
			pid:proc.name+this.counters[proc.name], proc, vars:{}, state:null, queue:[],
			sender:null, parent:parent?parent.pid:null, offspring:null,
			alive:true, pc:{trans:proc.start.trans,idx:0}, cur:proc.start.id, created:this.now,
		};
		this.instances.push(inst);
		Expr.parseDcl(proc.dcl||"").forEach(d=>{ inst.vars[d.name]=d.init?Expr.evaluate(d.init,this.scope(inst)):0; });
		this.emit({type:"create",pid:inst.pid,proc:proc.name,parent:inst.parent});
		return inst;
	}
	find(pid) {
		const n=String(pid).toLowerCase();
		return this.instances.find(i=>i.pid.toLowerCase()===n)||null;
	}
	alive() { return this.instances.filter(i=>i.alive); }
	resolvePid(v,self) {
		if (v===null || v===undefined) throw new SdlError("undefined pid (null)");
		const s=String(v);
		if (s.toLowerCase()==="env") return "env";
		const i=this.find(s);
		if (i) return i.pid;
		const p=this.project.processes.find(p=>p.name.toLowerCase()===s.toLowerCase());
		if (p) {
			const first=this.instances.find(x=>x.alive && x.proc.name===p.name && x!==self);
			if (first) return first.pid;
			throw new SdlError("no living instance of process "+p.name);
		}
		throw new SdlError("unknown receiver '"+s+"'");
	}
	scope(inst) {
		const sim=this;
		return {
			get(name,raw) {
				if (inst && Object.prototype.hasOwnProperty.call(inst.vars,name)) return inst.vars[name];
				switch (name) {
					case "self": if (inst) return inst.pid; break;
					case "sender": if (inst) { if (inst.sender===null) throw new SdlError("sender is null (no signal consumed yet)"); return inst.sender; } break;
					case "parent": if (inst) { if (inst.parent===null) return "env"; return inst.parent; } break;
					case "offspring": if (inst) { if (inst.offspring===null) throw new SdlError("offspring is null (nothing created yet)"); return inst.offspring; } break;
					case "now": return sim.now;
					case "env": return "env";
				}
				const i=sim.find(name); if (i) return i.pid;
				const p=sim.project.processes.find(p=>p.name.toLowerCase()===name);
				if (p) return p.name;
				if (!inst) throw new SdlError("unknown name '"+(raw||name)+"' (no such process instance or process)");
				throw new SdlError("undefined variable '"+(raw||name)+"'");
			},
			call(name,args) {
				switch (name) {
					case "random": { const a=Math.ceil(args[0]), b=Math.floor(args.length>1?args[1]:args[0]); return a+Math.floor(Math.random()*(b-a+1)); }
					case "abs": return Math.abs(args[0]);
					case "min": return Math.min(...args);
					case "max": return Math.max(...args);
					case "floor": return Math.floor(args[0]);
					case "round": return Math.round(args[0]);
					case "print": case "log": sim.emit({type:"log",pid:inst?inst.pid:"env",text:args.map(Expr.toText).join(" ")}); return true;
				}
				throw new SdlError("unknown function "+name+"()");
			},
		};
	}
	/* ---------------- signal delivery ---------------- */
	route(name,self) {
		const n=name.toUpperCase();
		const cand=this.alive().filter(i=>i!==self && this.acceptsAnywhere(i.proc,n));
		const ready=cand.find(i=>!i.pc && this.acceptsNow(i,n));
		return ready ? ready.pid : cand.length ? cand[0].pid : "env";
	}
	signalsOf(entry) {
		try { return Expr.parseInput(entry.text); } catch(e) { return []; }
	}
	acceptsAnywhere(proc,n) {
		return proc.states.some(s=>s.inputs.some(e=>e.type==="input" && this.signalsOf(e).some(sg=>sg.name.toUpperCase()===n)));
	}
	acceptsNow(inst,n) {
		const st=inst.state && Model.findState(inst.proc,inst.state);
		return !!st && st.inputs.some(e=>e.type==="input" && this.signalsOf(e).some(sg=>sg.name.toUpperCase()===n));
	}
	deliver(from,to,name,args,nodeId) {
		const ev=this.emit({type:"signal",from,to,name,args:args.slice(),nodeId});
		if (to==="env") return ev;
		const target=this.find(to);
		if (!target || !target.alive) { this.emit({type:"lost",from,to,name}); return ev; }
		target.queue.push({name,args:args.slice(),from,time:this.now});
		return ev;
	}
	// "GUESS(3) to Game1" typed by the user as the environment
	envSend(text) {
		this.error=null;
		const outs=Expr.parseOutput(text);
		const sc=this.scope(null);
		outs.forEach(o=>{
			const args=o.args.map(a=>Expr.evaluate(a,sc));
			const to=o.to ? this.resolvePid(Expr.evaluate(o.to,sc),null) : this.route(o.name,null);
			if (to==="env") throw new SdlError("no process accepts "+o.name);
			this.deliver("env",to,o.name,args,null);
		});
	}
	/* ---------------- execution ---------------- */
	order() {
		const n=this.instances.length;
		const out=[];
		for (let k=0;k<n;k++) out.push(this.instances[(this.rr+k)%n]);
		return out;
	}
	// one micro step; returns false when nothing can happen (waiting for the environment)
	step() {
		if (this.error) return false;
		let inst=null;
		try {
			// a running transition continues until its terminator
			inst=this.instances.find(i=>i.alive && i.pc && i.running);
			if (!inst) inst=this.order().find(i=>i.alive && i.pc);
			if (inst) { inst.running=true; this.execOne(inst); this.after(inst); return true; }
			for (const i of this.order()) {
				inst=i;
				if (i.alive && this.tryConsume(i)) { this.after(i); return true; }
			}
			inst=null;
			if (this.timers.length) { this.fireTimers(); this.steps++; return true; }
			return false;
		}
		catch(e) { this.fail(e,inst,inst?inst.cur:null); return false; }
	}
	after(inst) {
		this.steps++;
		if (!inst.pc) { inst.running=false; this.rr=(this.instances.indexOf(inst)+1)%Math.max(1,this.instances.length); }
	}
	fail(e,inst,nodeId) {
		if (!(e instanceof SdlError)) console.error(e);
		this.error={pid:inst?inst.pid:null,nodeId,msg:e.message};
		this.emit({type:"error",pid:this.error.pid,nodeId,text:e.message});
	}
	// run a whole transition (or up to max micro steps)
	stepTransition(max=1000) {
		if (!this.step()) return false;
		for (let k=0;k<max && this.instances.some(i=>i.alive&&i.running); k++) if (!this.step()) break;
		return true;
	}
	runUntilIdle(max=10000,advanceTime=false) {
		let k=0;
		while (k<max) {
			if (!advanceTime && !this.instances.some(i=>i.alive && (i.pc || i.queue.length)) ) break;
			if (!this.step()) break;
			k++;
		}
		return k;
	}
	fireTimers() {
		const t=Math.min(...this.timers.map(x=>x.time));
		this.now=Math.max(this.now,t);
		const due=this.timers.filter(x=>x.time<=t);
		this.timers=this.timers.filter(x=>x.time>t);
		due.forEach(x=>{
			const inst=this.find(x.pid);
			if (!inst || !inst.alive) return;
			inst.queue.push({name:x.name,args:[],from:inst.pid,time:this.now,timer:true});
			this.emit({type:"timeout",pid:inst.pid,name:x.name});
		});
		this.emit({type:"time",now:this.now});
	}
	stateOf(inst) {
		const st=Model.findState(inst.proc,inst.state);
		if (!st) throw new SdlError("state '"+inst.state+"' is not defined in "+inst.proc.name);
		return st;
	}
	tryConsume(inst) {
		if (inst.pc || !inst.queue.length) return false;
		const st=this.stateOf(inst);
		const inputs=new Map(); let star=null;
		const saves=new Set(); let saveAll=false;
		st.inputs.forEach(e=>{
			let sigs;
			try { sigs=Expr.parseInput(e.text); } catch(err) { inst.cur=e.id; throw err; }
			sigs.forEach(sg=>{
				const n=sg.name.toUpperCase();
				if (e.type==="save") { if (n==="*") saveAll=true; else saves.add(n); }
				else if (n==="*") star={entry:e,sig:sg};
				else if (!inputs.has(n)) inputs.set(n,{entry:e,sig:sg});
			});
		});
		for (let k=0;k<inst.queue.length;k++) {
			const s=inst.queue[k], n=s.name.toUpperCase();
			let hit=inputs.get(n);
			if (!hit && star && !saves.has(n) && !saveAll) hit=star;
			if (hit) {
				inst.queue.splice(k,1);
				hit.sig.params.forEach((p,j)=>{ inst.vars[p]=s.args[j]!==undefined?s.args[j]:0; });
				inst.sender=s.from;
				inst.pc={trans:hit.entry.trans,idx:0};
				inst.cur=hit.entry.id;
				inst.running=true;
				this.emit({type:"consume",pid:inst.pid,name:s.name,args:s.args,from:s.from,nodeId:hit.entry.id,state:inst.state});
				return true;
			}
			if (saves.has(n) || saveAll) continue;
			inst.queue.splice(k,1);
			this.emit({type:"discard",pid:inst.pid,name:s.name,state:inst.state});
			return true;
		}
		return false;
	}
	execOne(inst) {
		const pc=inst.pc;
		const sc=this.scope(inst);
		if (pc.idx<pc.trans.actions.length) {
			const node=pc.trans.actions[pc.idx];
			inst.cur=node.id;
			this.emit({type:"exec",pid:inst.pid,nodeId:node.id});
			switch (node.type) {
				case "task":
					Expr.parseStatements(node.text).forEach(st=>{
						switch (st.k) {
							case "assign": inst.vars[st.name]=Expr.evaluate(st.e,sc); break;
							case "inc": {
								const v=sc.get(st.name,st.name);
								if (typeof v!=="number") throw new SdlError(st.name+" is not a number");
								inst.vars[st.name]=v+st.d; break;
							}
							case "set": {
								const t=Expr.evaluate(st.e,sc);
								if (typeof t!=="number") throw new SdlError("set: time must be a number");
								this.removeTimer(inst,st.timer);
								this.timers.push({pid:inst.pid,name:st.timer,time:Math.max(t,this.now)});
								this.emit({type:"set",pid:inst.pid,name:st.timer,at:t});
								break;
							}
							case "reset": this.removeTimer(inst,st.timer); this.emit({type:"resettimer",pid:inst.pid,name:st.timer}); break;
							case "expr": Expr.evaluate(st.e,sc); break;
						}
					});
					break;
				case "output":
					Expr.parseOutput(node.text).forEach(o=>{
						const args=o.args.map(a=>Expr.evaluate(a,sc));
						const to=o.to ? this.resolvePid(Expr.evaluate(o.to,sc),inst) : this.route(o.name,inst);
						this.deliver(inst.pid,to,o.name,args,node.id);
					});
					break;
				case "create": {
					const cr=Expr.parseCreate(node.text);
					const proc=Model.findProc.call({project:this.project},cr.name);
					if (!proc) throw new SdlError("no process called "+cr.name);
					const child=this.spawn(proc,inst);
					inst.offspring=child.pid;
					break;
				}
				case "decision": {
					const v=Expr.evaluate(Expr.parse(node.text),sc);
					const b=this.chooseBranch(node,v,sc);
					this.emit({type:"decision",pid:inst.pid,nodeId:node.id,value:v,answer:b.answer});
					inst.pc={trans:b.trans,idx:0};
					return;
				}
				default: throw new SdlError("unknown symbol "+node.type);
			}
			pc.idx++;
			return;
		}
		const term=pc.trans.term;
		if (!term) throw new SdlError("transition has no terminator");
		inst.cur=term.id;
		if (term.type==="stop") {
			inst.alive=false; inst.pc=null; inst.running=false;
			this.timers=this.timers.filter(t=>t.pid!==inst.pid);
			this.emit({type:"stop",pid:inst.pid});
			return;
		}
		let target=term.text.trim();
		if (target==="-" || target==="") {
			if (inst.state===null) throw new SdlError("nextstate '-' in the start transition");
			target=inst.state;
		}
		const st=Model.findState(inst.proc,target);
		if (!st) throw new SdlError("state '"+target+"' is not defined");
		const old=inst.state;
		inst.state=st.name;
		inst.pc=null;
		inst.running=false;
		this.emit({type:"state",pid:inst.pid,from:old,to:st.name});
	}
	chooseBranch(node,v,sc) {
		let elseB=null;
		for (const b of node.branches) {
			const a=String(b.answer).trim().replace(/^\((.*)\)$/,"$1").trim();
			if (a.toLowerCase()==="else") { elseB=b; continue; }
			let m;
			if ((m=a.match(/^(<=|>=|\/=|!=|<|>|=)\s*([\s\S]+)$/))) {
				const r=Expr.evaluate(Expr.parse(m[2]),sc);
				const ok={ "<":v<r, ">":v>r, "<=":v<=r, ">=":v>=r, "=":Expr.equal(v,r), "/=":!Expr.equal(v,r), "!=":!Expr.equal(v,r) }[m[1]];
				if (ok) return b;
				continue;
			}
			let r;
			if (/^(true|yes|igen)$/i.test(a)) r=true;
			else if (/^(false|no|nem)$/i.test(a)) r=false;
			else r=Expr.evaluate(Expr.parse(a),sc);
			if (typeof r==="boolean") { if (Expr.truthy(v)===r) return b; }
			else if (Expr.equal(v,r)) return b;
		}
		if (elseB) return elseB;
		throw new SdlError("no decision branch for value "+Expr.toText(v));
	}
	removeTimer(inst,name) {
		const n=name.toUpperCase();
		this.timers=this.timers.filter(t=>!(t.pid===inst.pid && t.name.toUpperCase()===n));
		inst.queue=inst.queue.filter(s=>!(s.timer && s.name.toUpperCase()===n));
	}
	// signals the instance can consume in its current state (for UI hints)
	acceptedSignals(inst) {
		if (!inst || !inst.alive || !inst.state) return [];
		const st=Model.findState(inst.proc,inst.state);
		if (!st) return [];
		const out=[];
		st.inputs.forEach(e=>{ if (e.type==="input") this.signalsOf(e).forEach(sg=>out.push(sg)); });
		return out;
	}
	busy() { return this.instances.some(i=>i.alive && (i.pc || i.queue.length)) || this.timers.length>0; }
	// nothing can happen, but signals are waiting (all saved): typical deadlock
	stuck() { return !this.error && !this.instances.some(i=>i.alive && i.pc) && !this.timers.length && this.instances.some(i=>i.alive && i.queue.length); }
}

if (typeof module!=="undefined") module.exports={ Simulator };
