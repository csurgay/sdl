// SDL Design Tool - simulator UI: control window, process instance windows,
// signal animation across windows, Message Sequence Chart
"use strict";

const SimCtl = {
	sim:null,
	running:false,
	delay:500,
	loopTimer:null,
	windows:new Map(),      // pid -> InstanceWindow
	active:false,           // instance windows appear when the simulation is first used
	log:[],
	history:[],
	win:null, msc:null,
	cascade:0,
	init() {
		this.sim=new Simulator(Model.project);
		this.sim.on((ev,sim)=>this.onEvent(ev,sim));
		this.reset();
	},
	reset() {
		this.pause();
		WM.commitEdit();
		this.windows.forEach(w=>{ if (w.father) w.father.remove(w); });
		this.windows.clear();
		this.cascade=0;
		this.active=false;
		this.log=[];
		this.sim.reset(Model.project);
		this.addLog("Simulation reset – "+this.sim.alive().length+" instance(s)",THEME.textDim);
		invalidate();
	},
	started() { return this.sim && this.sim.trace.length>0; },
	activate() {
		if (this.active) return;
		this.active=true;
		this.sim.instances.forEach(i=>this.openInstance(i));
	},
	step() {
		WM.commitEdit();
		this.activate();
		if (this.sim.error) { this.addLog("Error: reset the simulation (F9)","#c01818"); return false; }
		const ok=this.sim.step();
		if (!ok) this.idleMessage();
		invalidate();
		return ok;
	},
	idleMessage() {
		if (this.sim.error) return;
		if (this.sim.stuck()) {
			const w=this.sim.alive().filter(i=>i.queue.length).map(i=>i.pid+"["+i.queue.map(q=>q.name).join(",")+"]").join(" ");
			this.addLog("DEADLOCK? nothing can move, only saved signals wait: "+w,"#c01818",true);
		}
		else this.addLog("Idle – waiting for a signal from the environment",THEME.textDim,true);
	},
	stepTransition() {
		WM.commitEdit();
		this.activate();
		const ok=this.sim.stepTransition();
		if (!ok) this.idleMessage();
		invalidate();
	},
	run() { if (this.running) this.pause(); else { this.activate(); this.running=true; this.loop(); } invalidate(); },
	pause() { this.running=false; clearTimeout(this.loopTimer); invalidate(); },
	loop() {
		if (!this.running) return;
		if (!this.sim.step()) {
			if (this.sim.error) { this.pause(); return; }
			if (this.sim.stuck()) { this.idleMessage(); this.pause(); return; }
		}
		invalidate();
		this.loopTimer=setTimeout(()=>this.loop(),this.delay);
	},
	faster() { this.delay=Math.max(20,Math.round(this.delay/1.6)); invalidate(); },
	slower() { this.delay=Math.min(3000,Math.round(this.delay*1.6)); invalidate(); },
	envSend(text) {
		text=String(text).trim();
		if (!text) return;
		this.activate();
		try {
			this.sim.envSend(text);
			this.history=this.history.filter(h=>h!==text); this.history.push(text);
		}
		catch(e) { this.addLog("env: "+e.message,"#c01818"); }
		invalidate();
	},
	addLog(text,color,dedupe=false) {
		if (dedupe && this.log.length && this.log[this.log.length-1].text===text) return;
		this.log.push({text,color});
		if (this.log.length>2000) this.log.splice(0,500);
	},
	argText(args) { return args && args.length ? "("+args.map(Expr.toText).join(", ")+")" : ""; },
	onEvent(ev,sim) {
		const t="["+Expr.toText(ev.time)+"] ";
		switch (ev.type) {
			case "create": {
				const inst=sim.find(ev.pid);
				this.openInstance(inst);
				if (ev.parent) this.addLog(t+ev.parent+" created "+ev.pid,"#2c6e2c");
				break;
			}
			case "signal":
				SimAnim.signal(ev);
				if (ev.to==="env") this.addLog(t+"env ← "+ev.name+this.argText(ev.args)+"   from "+ev.from,"#1f4f8a");
				else if (ev.from==="env") this.addLog(t+"env → "+ev.name+this.argText(ev.args)+"   to "+ev.to,"#7a3d00");
				break;
			case "stop": this.addLog(t+ev.pid+" stopped",THEME.textDim); break;
			case "discard": this.addLog(t+ev.pid+" discarded "+ev.name+" in state "+ev.state,"#a05a00"); break;
			case "lost": this.addLog(t+"signal "+ev.name+" to "+ev.to+" lost (receiver stopped)","#a05a00"); break;
			case "timeout": this.addLog(t+"timer "+ev.name+" expired in "+ev.pid,"#6a3d9a"); break;
			case "log": this.addLog(t+ev.pid+": "+ev.text,THEME.text); break;
			case "error": {
				this.addLog(t+"ERROR"+(ev.pid?" in "+ev.pid:"")+": "+ev.text,"#c01818");
				const w=ev.pid && this.windows.get(ev.pid);
				if (w) { w.show(); if (ev.nodeId) w.view.ensureVisible(ev.nodeId,true); }
				break;
			}
		}
		if (["exec","consume","state","decision"].includes(ev.type)) {
			const w=this.windows.get(ev.pid), inst=sim.find(ev.pid);
			if (w && inst && w.visible && inst.cur) w.view.ensureVisible(inst.cur);
		}
		invalidate();
	},
	openInstance(inst) {
		if (!this.active) return null;
		let w=this.windows.get(inst.pid);
		if (!w) {
			const ca=WM.root.clientArea;
			const k=this.cascade++%8;
			const ww=Math.min(470,Math.max(300,ca.w-640)), wh=Math.min(460,ca.h-60);
			w=new InstanceWindow(inst,new Rect(170+k*30,30+k*26,ww,wh));
			ca.push(w);
			this.windows.set(inst.pid,w);
		}
		w.visible=true;
		// keep the simulator windows above the instances
		if (this.win && this.win.visible) this.win.father.bringFwd(this.win);
		if (this.msc && this.msc.visible) this.msc.father.bringFwd(this.msc);
		return w;
	},
	accepted() {
		return this.sim.alive().filter(i=>!i.pc).map(i=>{
			const a=this.sim.acceptedSignals(i);
			return a.length ? i.pid+": "+a.map(s=>s.name+(s.params.length?"("+s.params.join(",")+")":"")).join(" ") : null;
		}).filter(x=>x).join("   |   ");
	},
	statusText() {
		const s=this.sim;
		let st=this.running?"running":"paused";
		if (s.error) st="ERROR";
		else if (s.stuck()) st="DEADLOCK?";
		else if (!s.busy()) st+=", idle";
		return "time "+Expr.toText(s.now)+"   steps "+s.steps+"   "+st+"   (delay "+this.delay+" ms)";
	},
};

/* ------------------------------------------------------------------ */
/* signal animation drawn in the overlay: flies from window to window   */
/* ------------------------------------------------------------------ */
const SimAnim = {
	enabled:true,
	anchorOf(pid,nodeId,isTarget) {
		if (pid==="env") {
			const w=SimCtl.win;
			if (w && w.visible && !w.collapsed) { w.envField.absolute(); return { x:w.envField.ax+w.envField.w/2, y:w.envField.ay+w.envField.h/2 }; }
			return { x:WM.root.w-40, y:WM.root.h-40 };
		}
		const w=SimCtl.windows.get(pid);
		if (!w || !w.visible) return null;
		w.absolute();
		if (w.collapsed) return { x:w.ax+w.w/2, y:w.ay+ddhead/2 };
		if (isTarget) return w.info.queueAnchor();
		const it=nodeId && w.view.item(nodeId);
		if (it) {
			const p=w.view.toScreen(it.x+it.w/2,it.y+it.h/2);
			w.view.absolute();
			return { x:Math.max(w.view.ax,Math.min(p.x,w.view.ax+w.view.w)), y:Math.max(w.view.ay,Math.min(p.y,w.view.ay+w.view.h)) };
		}
		return { x:w.ax+w.w/2, y:w.ay+ddhead/2 };
	},
	signal(ev) {
		if (!this.enabled) return;
		const a=this.anchorOf(ev.from,ev.nodeId,false), b=this.anchorOf(ev.to,null,true);
		if (!a || !b) return;
		const label=ev.name+SimCtl.argText(ev.args);
		const dur=Math.max(180,Math.min(900,SimCtl.delay*0.9));
		const lift=Math.min(80,Math.hypot(b.x-a.x,b.y-a.y)*0.25);
		const mx=(a.x+b.x)/2, my=(a.y+b.y)/2-lift;
		WM.animations.push({ t0:performance.now(), dur, paint:(t)=>{
			const e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
			const x=(1-e)*(1-e)*a.x+2*(1-e)*e*mx+e*e*b.x;
			const y=(1-e)*(1-e)*a.y+2*(1-e)*e*my+e*e*b.y;
			ctx.save();
			ctx.strokeStyle="rgba(30,111,217,0.35)"; ctx.lineWidth=2; ctx.setLineDash([5,4]);
			ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.quadraticCurveTo(mx,my,b.x,b.y); ctx.stroke();
			ctx.setLineDash([]);
			// envelope
			ctx.fillStyle="#fff7d6"; ctx.strokeStyle="#b07d00"; ctx.lineWidth=1.3;
			ctx.fillRect(x-9,y-6,18,12); ctx.strokeRect(x-9,y-6,18,12);
			ctx.beginPath(); ctx.moveTo(x-9,y-6); ctx.lineTo(x,y+1); ctx.lineTo(x+9,y-6); ctx.stroke();
			ctx.font="bold 12px Arial"; ctx.textAlign="left"; ctx.textBaseline="middle";
			const tw=ctx.measureText(label).width;
			ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.fillRect(x+12,y-9,tw+8,18);
			ctx.fillStyle="#7a4f00"; ctx.fillText(label,x+16,y+1);
			ctx.restore();
		}});
		invalidate();
	},
};

/* ------------------------------------------------------------------ */
/* one process instance: state, variables, queue + its diagram          */
/* ------------------------------------------------------------------ */
class InstanceInfo extends Area {
	constructor(inst) {
		super(0,0,10,58);
		this.class="InstanceInfo";
		this.inst=inst;
	}
	queueAnchor() { this.absolute(); return { x:this.ax+Math.min(this.w-20,this.qx||80), y:this.ay+46 }; }
	paint() {
		const i=this.inst, x=this.ax+8;
		c.fillRect(this.ax,this.ay,this.w,this.h,i.alive?"#f4f7fa":"#eeeeee");
		c.line(this.ax,this.ay+this.h-0.5,this.w,0,"#c2c7ce");
		const st=!i.alive?"STOPPED":(i.state===null?"(start transition)":i.state)+(i.pc?"  ▸ running":"");
		const f=(v)=>v===null?"-":Expr.toText(v);
		c.fitText("State: "+st+"     sender: "+f(i.sender)+"   parent: "+f(i.parent)+"   offspring: "+f(i.offspring),x,this.ay+10,this.w-16,"left",i.alive?THEME.text:THEME.textDim,THEME.fontBold);
		const vars=Object.keys(i.vars).map(k=>k+" = "+Expr.toText(i.vars[k])).join(",   ");
		c.fitText("Vars: "+(vars||"-"),x,this.ay+28,this.w-16,"left",THEME.text,THEME.fontMono);
		let qx=x+c.measure("Queue:")+10;
		c.fillText("Queue:",x,this.ay+46,"left",THEME.text);
		ctx.font=THEME.fontSmall;
		i.queue.forEach(s=>{
			const t=s.name+SimCtl.argText(s.args)+" ← "+s.from;
			const w=c.measure(t,THEME.fontSmall)+10;
			if (qx+w>this.ax+this.w-8) return;
			c.roundRect(qx,this.ay+38,w,16,3,s.timer?"#efe3fa":"#fff7d6","#b07d00");
			c.fillText(t,qx+5,this.ay+46.5,"left",THEME.text,THEME.fontSmall);
			qx+=w+4;
		});
		if (!i.queue.length) c.fillText("(empty)",qx,this.ay+46,"left",THEME.textDim,THEME.fontSmall);
		this.qx=qx-this.ax+10;
	}
}

class InstanceWindow extends Window {
	constructor(inst,prect) {
		super("",prect,CLOSABLE,RESIZABLE,{closeAction:"hide",minW:220,minH:160});
		this.class="InstanceWindow";
		this.inst=inst;
		this.title=()=>inst.pid+" : "+inst.proc.name+(inst.alive?"":"  (stopped)");
		this.info=this.push(new InstanceInfo(inst));
		this.view=this.push(new DiagramView(()=>inst.proc,{ readOnly:true, top:58, zoom:0.8, highlight:()=>{
			const e=SimCtl.sim.error;
			return {
				curId:inst.alive && inst.pc ? inst.cur : null,
				stateName:inst.alive ? inst.state : null,
				errorId:e && e.pid===inst.pid ? e.nodeId : null,
			};
		}}));
		this.layout();
	}
	onLayout() { if (this.info) this.info.set(0,0,this.clientArea.w,58); }
}

/* ------------------------------------------------------------------ */
class SimWindow extends Window {
	constructor(prect) {
		super("Simulator",prect,CLOSABLE,RESIZABLE,{minW:380,minH:200});
		this.class="SimWindow";
		const b=(cap,fn,tip,opts={})=>this.push(new Button(cap,0,4,0,24,fn,Object.assign({tooltip:tip},opts)));
		this.btns=[
			b("Reset",()=>SimCtl.reset(),"Reset simulation (F9)"),
			b("Step",()=>SimCtl.step(),"One symbol (F10)"),
			b("Transition",()=>SimCtl.stepTransition(),"A whole transition (Shift+F10)"),
			b("Run",()=>SimCtl.run(),"Run / pause (F8)",{toggled:()=>SimCtl.running}),
			b("Slower",()=>SimCtl.slower(),"Longer delay between steps"),
			b("Faster",()=>SimCtl.faster(),"Shorter delay between steps"),
		];
		this.status=this.push(new Label(()=>SimCtl.statusText(),8,32,300,18,{font:THEME.fontSmall,color:"#3a4048"}));
		this.envLabel=this.push(new Label("env:",8,56,34,22,{font:THEME.fontBold}));
		this.envField=this.push(new TextField("",44,56,200,24,{placeholder:"SIGNAL(args) to Process   – Enter sends",keepAfterEnter:true,onEnter:(v)=>{ SimCtl.envSend(v); this.envField.value=""; }}));
		this.sendBtn=b("Send",()=>{ WM.commitEdit(); SimCtl.envSend(this.envField.value); this.envField.value=""; },"Send the signal from the environment");
		this.histBtn=b("▾",()=>this.historyMenu(),"Previously sent signals");
		this.accepts=this.push(new Label(()=>{ const a=SimCtl.accepted(); return a?"accepts now → "+a:""; },8,84,300,18,{font:THEME.fontSmall,color:"#2c6e2c"}));
		this.logView=this.push(new ListView(0,0,10,10,{ items:()=>SimCtl.log, stickBottom:true, font:THEME.fontSmall, rowH:16 }));
		this.logView.fill={l:4,t:106,r:4,b:4};
		this.layout();
	}
	historyMenu() {
		const h=SimCtl.history.slice().reverse().slice(0,15);
		const sug=[];
		SimCtl.sim.alive().filter(i=>!i.pc).forEach(i=>SimCtl.sim.acceptedSignals(i).forEach(s=>{
			sug.push(s.name+(s.params.length?"("+s.params.map(()=>"0").join(", ")+")":"")+" to "+i.pid);
		}));
		const items=h.map(t=>({caption:t,action:()=>{ this.envField.value=t; this.envField.edit(); }}));
		if (sug.length) { if (items.length) items.push("-"); sug.forEach(t=>items.push({caption:t,action:()=>{ this.envField.value=t; this.envField.edit(); }})); }
		if (!items.length) items.push({caption:"(nothing yet)",enabled:()=>false});
		this.histBtn.absolute();
		popupMenu(items,this.histBtn.ax-200,this.histBtn.ay+26);
	}
	onLayout() {
		if (!this.btns) return;
		let x=6;
		this.btns.forEach(bt=>{ bt.x=x; bt.y=4; x+=bt.w+4; });
		const W=this.clientArea.w;
		this.status.w=W-16;
		this.accepts.w=W-16;
		this.histBtn.w=26; this.histBtn.x=W-6-26; this.histBtn.y=56;
		this.sendBtn.x=this.histBtn.x-4-this.sendBtn.w; this.sendBtn.y=56;
		this.envField.w=Math.max(60,this.sendBtn.x-4-44);
	}
}

/* ------------------------------------------------------------------ */
/* Message Sequence Chart built from the simulation trace               */
/* ------------------------------------------------------------------ */
class MscView extends Area {
	constructor() {
		super(0,0,10,10);
		this.class="MscView";
		this.scrollY=0; this.scrollX=0;
		this.follow=true;
		this.showStates=true;
		this.COLW=118; this.ROWH=24; this.X0=16; this.HEAD=34;
	}
	build() {
		const trace=SimCtl.sim.trace;
		const cols=["env"], colOf=new Map([["env",0]]);
		const head=new Map([["env",-1]]), end=new Map();
		const rows=[];
		let row=0;
		trace.forEach(ev=>{
			switch (ev.type) {
				case "create":
					colOf.set(ev.pid,cols.length); cols.push(ev.pid);
					if (ev.parent) { rows.push({k:"create",from:ev.parent,to:ev.pid,row}); head.set(ev.pid,row); row+=2; }
					else head.set(ev.pid,-1);
					break;
				case "signal": rows.push({k:"sig",from:ev.from,to:ev.to,text:ev.name+SimCtl.argText(ev.args),row,time:ev.time}); row++; break;
				case "state": if (this.showStates) { rows.push({k:"state",pid:ev.pid,text:ev.to,row}); row++; } break;
				case "stop": rows.push({k:"stop",pid:ev.pid,row}); end.set(ev.pid,row); row++; break;
				case "timeout": rows.push({k:"timeout",pid:ev.pid,text:ev.name,row}); row++; break;
				case "discard": rows.push({k:"note",pid:ev.pid,text:"✗ "+ev.name,row,color:"#a05a00"}); row++; break;
				case "lost": rows.push({k:"note",pid:ev.from,text:"lost "+ev.name,row,color:"#a05a00"}); row++; break;
				case "time": rows.push({k:"time",text:"t = "+Expr.toText(ev.now),row}); row++; break;
				case "error": rows.push({k:"note",pid:ev.pid||"env",text:"ERROR: "+ev.text,row,color:"#c01818"}); row++; break;
			}
		});
		return {cols,colOf,head,end,rows,nrows:row};
	}
	colX(i) { return this.ax+this.X0+i*this.COLW+this.COLW/2-this.scrollX; }
	rowY(r) { return this.ay+this.HEAD+14+r*this.ROWH-this.scrollY; }
	paint() {
		c.fillRect(this.ax,this.ay,this.w,this.h,"#ffffff");
		const m=this.build();
		const total=this.HEAD+14+(m.nrows+2)*this.ROWH;
		const maxScroll=Math.max(0,total-this.h);
		if (this.follow) this.scrollY=maxScroll;
		this.scrollY=Math.max(0,Math.min(this.scrollY,maxScroll));
		this.maxScroll=maxScroll;
		const bottom=this.ay+this.h;
		// lifelines
		m.cols.forEach((pid,i)=>{
			const x=this.colX(i);
			const hr=m.head.get(pid);
			const y0=hr<0||hr===undefined?this.ay+this.HEAD:this.rowY(hr)+this.ROWH;
			const y1=m.end.has(pid)?this.rowY(m.end.get(pid)):bottom;
			ctx.save();
			ctx.strokeStyle="#8a9099"; ctx.lineWidth=1; if (pid==="env") ctx.setLineDash([4,4]);
			ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,y1); ctx.stroke();
			ctx.restore();
		});
		// rows
		m.rows.forEach(r=>{
			const y=this.rowY(r.row);
			if (y<this.ay-this.ROWH || y>bottom+this.ROWH) return;
			if (r.k==="sig") {
				const a=this.colX(m.colOf.get(r.from)||0), b=this.colX(m.colOf.get(r.to)||0);
				if (a===b) {   // to itself
					ctx.save(); ctx.strokeStyle="#1d2126"; ctx.beginPath(); ctx.moveTo(a,y-6); ctx.lineTo(a+22,y-6); ctx.lineTo(a+22,y+6); ctx.lineTo(a+4,y+6); ctx.stroke(); ctx.restore();
					this.arrowHead(a,y+6,-1);
					c.fillText(r.text,a+26,y,"left",THEME.text,THEME.fontSmall);
				}
				else {
					c.line(a,y,b-a,0,"#1d2126");
					this.arrowHead(b,y,a<b?1:-1);
					c.fillText(r.text,(a+b)/2,y-7,"center","#1f4f8a",THEME.fontSmall);
				}
			}
			else if (r.k==="create") {
				const a=this.colX(m.colOf.get(r.from)), bi=m.colOf.get(r.to), b=this.colX(bi);
				const hx=b+(a<b?-50:50);
				ctx.save(); ctx.strokeStyle="#2c6e2c"; ctx.setLineDash([5,3]);
				ctx.beginPath(); ctx.moveTo(a,y+this.ROWH/2); ctx.lineTo(hx,y+this.ROWH/2); ctx.stroke(); ctx.restore();
				this.arrowHead(hx,y+this.ROWH/2,a<b?1:-1,"#2c6e2c");
				c.fillText("create",(a+hx)/2,y+this.ROWH/2-7,"center","#2c6e2c",THEME.fontSmall);
			}
			else if (r.k==="state") {
				const x=this.colX(m.colOf.get(r.pid));
				const w=Math.min(this.COLW-10,c.measure(r.text,THEME.fontSmall)+14);
				ctx.save();
				symbolPath("state",x-w/2,y-8,w,16);
				ctx.fillStyle="#d7f0d2"; ctx.fill(); ctx.strokeStyle="#4a7a44"; ctx.stroke();
				ctx.restore();
				c.fitText(r.text,x,y+1,w-8,"center",THEME.text,THEME.fontSmall);
			}
			else if (r.k==="stop") {
				const x=this.colX(m.colOf.get(r.pid));
				c.line(x-7,y-7,14,14,"#1d2126"); c.line(x+7,y-7,-14,14,"#1d2126");
			}
			else if (r.k==="timeout") {
				const x=this.colX(m.colOf.get(r.pid));
				ctx.save(); ctx.strokeStyle="#6a3d9a"; ctx.beginPath();
				ctx.moveTo(x-6,y-7); ctx.lineTo(x+6,y-7); ctx.lineTo(x-6,y+7); ctx.lineTo(x+6,y+7); ctx.closePath(); ctx.stroke(); ctx.restore();
				c.fillText("timeout "+r.text,x+10,y,"left","#6a3d9a",THEME.fontSmall);
			}
			else if (r.k==="note") {
				const x=this.colX(m.colOf.get(r.pid)||0);
				c.fillText(r.text,x+8,y,"left",r.color,THEME.fontSmall);
			}
			else if (r.k==="time") {
				ctx.save(); ctx.strokeStyle="#c9ced5"; ctx.setLineDash([2,4]);
				ctx.beginPath(); ctx.moveTo(this.ax,y); ctx.lineTo(this.ax+this.w,y); ctx.stroke(); ctx.restore();
				c.fillText(r.text,this.ax+4,y-7,"left","#6a3d9a",THEME.fontSmall);
			}
		});
		// instance heads (drawn last => on top); a head scrolled out of view sticks to the top
		c.fillRect(this.ax,this.ay,this.w,this.HEAD+2,"rgba(255,255,255,0.92)");
		m.cols.forEach((pid,i)=>{
			const x=this.colX(i), hr=m.head.get(pid);
			let y=hr<0||hr===undefined?this.ay+6:this.rowY(hr)+this.ROWH/2-12;
			if (y<this.ay+6) {
				if (m.end.has(pid) && this.rowY(m.end.get(pid))<this.ay+this.HEAD) return;   // already stopped
				y=this.ay+6;
			}
			const w=this.COLW-18;
			if (y>bottom) return;
			c.roundRect(x-w/2,y,w,24,pid==="env"?12:2,pid==="env"?"#f3f3f3":"#eef4fb",pid==="env"?"#8a9099":"#3b6ea5");
			c.fitText(pid,x,y+12.5,w-8,"center",THEME.text,THEME.fontBold);
		});
		if (!SimCtl.started()) c.fillText("Start the simulation (Simulator window) to see the MSC",this.ax+10,this.ay+this.h-14,"left",THEME.textDim);
	}
	arrowHead(x,y,dir,color="#1d2126") {
		ctx.save(); ctx.fillStyle=color; ctx.beginPath();
		ctx.moveTo(x,y); ctx.lineTo(x-8*dir,y-4); ctx.lineTo(x-8*dir,y+4); ctx.closePath(); ctx.fill(); ctx.restore();
	}
	processEvent(pevt) {
		if (pevt.type===e_wheel) {
			if (pevt.shift) this.scrollX=Math.max(0,this.scrollX+pevt.deltaY);
			else { this.scrollY+=pevt.deltaY; this.scrollX=Math.max(0,this.scrollX+pevt.deltaX); this.follow=this.scrollY>=(this.maxScroll||0); }
			invalidate(); return true;
		}
		if (pevt.type===e_down) {
			const sx=pevt.x, sy=pevt.y, x0=this.scrollX, y0=this.scrollY;
			WM.setCapture({ cursor:"grabbing", move:(e)=>{ this.scrollX=Math.max(0,x0-(e.x-sx)); this.scrollY=y0-(e.y-sy); this.follow=false; }, up:()=>{ this.follow=this.scrollY>=(this.maxScroll||0)-2; } });
			return true;
		}
		return false;
	}
}

class MscWindow extends Window {
	constructor(prect) {
		super("Message Sequence Chart",prect,CLOSABLE,RESIZABLE,{minW:240,minH:140});
		this.class="MscWindow";
		this.view=this.push(new MscView());
		this.view.fill={l:0,t:30,r:0,b:0};
		this.push(new Button("States",6,4,0,22,()=>{ this.view.showStates=!this.view.showStates; invalidate(); },{toggled:()=>this.view.showStates,tooltip:"Show state changes on the lifelines"}));
		this.push(new Button("Follow",70,4,0,22,()=>{ this.view.follow=true; invalidate(); },{toggled:()=>this.view.follow,tooltip:"Scroll with the simulation"}));
		this.push(new Button("Export…",136,4,0,22,()=>exportMsc(),{tooltip:"Save as sequencediagram.org text"}));
		this.layout();
	}
}

// sequencediagram.org source, like docs/GuessingGameMSC.txt
function mscText() {
	const out=["title "+Model.project.name,"","actor env"];
	const tr=SimCtl.sim.trace;
	tr.forEach(ev=>{ if (ev.type==="create" && !ev.parent) out.push("participant "+ev.pid); });
	out.push("");
	tr.forEach(ev=>{
		if (ev.type==="create" && ev.parent) out.push(ev.parent+"-->*"+ev.pid+":create");
		if (ev.type==="signal") out.push(ev.from+"->"+ev.to+":"+ev.name+SimCtl.argText(ev.args));
		if (ev.type==="stop") out.push("destroyafter "+ev.pid);
		if (ev.type==="state") out.push("state over "+ev.pid+":"+ev.to);
	});
	return out.join("\n")+"\n";
}
function exportMsc() {
	if (!SimCtl.started()) { WM.message("Export MSC","Nothing to export yet – run the simulation first."); return; }
	download((Model.project.name||"sdl").replace(/\W+/g,"_")+"_msc.txt",mscText());
}
function download(fname,text) {
	const a=document.createElement("a");
	a.href=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
	a.download=fname;
	document.body.appendChild(a); a.click();
	setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
