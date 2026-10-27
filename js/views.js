// SDL Design Tool - diagram view, process editor, project window
"use strict";

/* ------------------------------------------------------------------ */
/* DiagramView: pan/zoomable view of one process (editable or read-only) */
/* ------------------------------------------------------------------ */
class DiagramView extends Area {
	constructor(pprocFn,opts={}) {
		super(0,0,10,10);
		this.class="DiagramView";
		this.procFn=pprocFn;           // () => process object
		this.readOnly=!!opts.readOnly;
		this.highlight=opts.highlight||null;   // () => {curId, stateName, errorId}
		this.fill={l:0,t:opts.top||0,r:0,b:0};
		this.ox=0; this.oy=0; this.z=opts.zoom||1;
		this.lay=null; this.layVersion=-1; this.layProc=null;
		this.selectedId=null;
		this.dropId=null;
	}
	proc() { return this.procFn(); }
	relayout(force=false) {
		const p=this.proc();
		if (!p) { this.lay=null; return null; }
		if (force || !this.lay || this.layVersion!==Model.version || this.layProc!==p) {
			this.lay=layoutProcess(p);
			this.layVersion=Model.version;
			this.layProc=p;
		}
		return this.lay;
	}
	toDiagram(px,py) { this.absolute(); return { x:(px-this.ax-this.ox)/this.z, y:(py-this.ay-this.oy)/this.z }; }
	toScreen(x,y) { this.absolute(); return { x:this.ax+this.ox+x*this.z, y:this.ay+this.oy+y*this.z }; }
	itemAt(px,py) {
		const lay=this.relayout(); if (!lay) return null;
		const d=this.toDiagram(px,py);
		return hitLayout(lay,d.x,d.y);
	}
	item(id) { const lay=this.relayout(); return lay && id ? lay.byId.get(id)||null : null; }
	selectedItem() { return this.item(this.selectedId); }
	paint() {
		c.fillRect(this.ax,this.ay,this.w,this.h,"#ffffff");
		const lay=this.relayout();
		if (!lay) { c.fillText("(process deleted)",this.ax+10,this.ay+16,"left",THEME.textDim); return; }
		ctx.save();
		ctx.translate(this.ax+this.ox,this.ay+this.oy);
		ctx.scale(this.z,this.z);
		const hl=this.highlight?this.highlight():{};
		paintLayout(lay,Object.assign({selectedId:this.readOnly?null:this.selectedId,dropId:this.dropId},hl));
		ctx.restore();
		if (this.z!==1) c.fillText(Math.round(this.z*100)+"%",this.ax+this.w-22,this.ay+this.h-10,"right",THEME.textDim,THEME.fontSmall);
	}
	zoomAt(px,py,f) {
		const d=this.toDiagram(px,py);
		this.z=Math.max(0.25,Math.min(3,this.z*f));
		this.absolute();
		this.ox=px-this.ax-d.x*this.z; this.oy=py-this.ay-d.y*this.z;
		invalidate();
	}
	fit() {
		const lay=this.relayout(); if (!lay) return;
		this.z=Math.max(0.25,Math.min(1.2,Math.min(this.w/lay.w,this.h/lay.h)));
		this.ox=Math.max(0,(this.w-lay.w*this.z)/2); this.oy=0;
		invalidate();
	}
	ensureVisible(id,center=false) {
		const it=this.item(id); if (!it) return;
		const x0=it.x*this.z+this.ox, y0=it.y*this.z+this.oy, x1=(it.x+it.w)*this.z+this.ox, y1=(it.y+it.h)*this.z+this.oy;
		const m=30;
		if (center || x0<m || x1>this.w-m) this.ox=this.w/2-(it.x+it.w/2)*this.z;
		if (center || y0<m || y1>this.h-m) this.oy=this.h/2-(it.y+it.h/2)*this.z;
		invalidate();
	}
	select(id) { this.selectedId=id; WM.lastView=this; invalidate(); }
	processEvent(pevt) {
		if (!this.readOnly) WM.lastView=this;
		if (pevt.type===e_wheel) {
			if (pevt.ctrl) this.zoomAt(pevt.x,pevt.y,pevt.deltaY<0?1.1:1/1.1);
			else if (pevt.shift) { this.ox-=pevt.deltaY; invalidate(); }
			else { this.ox-=pevt.deltaX; this.oy-=pevt.deltaY; invalidate(); }
			return true;
		}
		const it=this.itemAt(pevt.x,pevt.y);
		if (pevt.type===e_down) {
			if (it && it.ref && !this.readOnly && pevt.button===0) { this.select(it.id); return true; }
			if (!it || this.readOnly || pevt.button===1) {
				if (!this.readOnly) this.select(null);
				const sx=pevt.x, sy=pevt.y, ox=this.ox, oy=this.oy;
				WM.setCapture({ cursor:"grabbing", move:(e)=>{ this.ox=ox+e.x-sx; this.oy=oy+e.y-sy; }, up:()=>{} });
				return true;
			}
			return true;
		}
		if (pevt.type===e_dbl && !this.readOnly) {
			if (it && it.ref) this.editItem(it);
			return true;
		}
		if (pevt.type===e_ctx) {
			if (this.readOnly) { popupMenu([{caption:"Fit to window",action:()=>this.fit()},{caption:"Zoom 100%",action:()=>{this.z=1;invalidate();}}],pevt.x,pevt.y); return true; }
			if (it && it.ref) this.select(it.id); else this.select(null);
			this.contextMenu(it,pevt.x,pevt.y);
			return true;
		}
		return false;
	}
	onKey(k) {
		if (this.readOnly) return false;
		const it=this.selectedItem();
		if ((k.key==="Delete"||k.key==="Backspace") && it && it.ref) { this.deleteItem(it); return true; }
		if ((k.key==="F2"||k.key==="Enter") && it && it.ref) { this.editItem(it); return true; }
		if (k.key==="+"||k.key==="=") { this.zoomAt(this.ax+this.w/2,this.ay+this.h/2,1.15); return true; }
		if (k.key==="-") { this.zoomAt(this.ax+this.w/2,this.ay+this.h/2,1/1.15); return true; }
		if (k.key==="0") { this.fit(); return true; }
		return false;
	}
	// ---- editing ----
	doEdit(label,fn) {
		try { return Model.edit(label,fn); }
		catch(e) { WM.message("Error",e.message); return false; }
	}
	editItem(it) {
		const ref=it.ref;
		if (!Model.canEditText(ref)) return;
		const p=this.toScreen(it.x,it.y);
		const w=Math.max(it.w*this.z,150), h=Math.max(it.h*this.z,ref.kind==="branch"?24:48);
		const single=ref.kind==="state"||ref.kind==="term"||ref.kind==="branch"||ref.kind==="create";
		WM.editText({
			owner:this, x:p.x-(w-it.w*this.z)/2, y:p.y, w, h:single?Math.max(26,Math.min(h,30)):h,
			value:Model.getText(ref), multiline:!single, font:"13px Arial", align:"center",
			onCommit:(v)=>{ if (v!==Model.getText(ref)) this.doEdit("text",()=>Model.setText(ref,v)); },
		});
	}
	deleteItem(it) {
		const ref=it.ref;
		if (!Model.canDelete(ref)) { if (ref.kind==="term") this.doEdit("stop",()=>Model.setTerm(ref,"stop")); return; }
		const go=()=>{ this.doEdit("delete",()=>Model.deleteRef(ref)); this.select(null); };
		if (ref.kind==="state" && ref.state.inputs.length) WM.confirm("Delete state","Delete state "+ref.state.name+" with all its transitions?",go);
		else go();
	}
	// insert/drop logic shared by drag&drop, palette click and context menu
	applySymbol(type,it) {
		const ref=it?it.ref:null;
		for (let a=this.father; a; a=a.father) if (a instanceof Window) { a.activate(); break; }
		let created=null;
		if (["task","output","create","decision","timer"].includes(type)) {
			if (!ref || !Model.canInsert(ref,type)) { WM.message("Insert","Drop the symbol on a symbol of a transition:\nit is inserted after that symbol."); return; }
			created=this.doEdit("insert",()=>Model.insertAction(ref,type));
		}
		else if (type==="input"||type==="save") {
			if (!ref || (ref.kind!=="state"&&ref.kind!=="input")) { WM.message("Insert","Drop an input / save on a state (or on an input)."); return; }
			created=this.doEdit("input",()=>Model.addInput(ref.proc,ref.state,type,undefined,ref.kind==="input"?ref.index:undefined));
		}
		else if (type==="state") {
			if (ref && ref.kind==="term") { this.doEdit("nextstate",()=>Model.setTerm(ref,"nextstate")); created={id:ref.trans.term.id}; }
			else created=this.doEdit("state",()=>Model.addState(this.proc(),"State"));
		}
		else if (type==="stop") {
			if (!ref || ref.kind!=="term") { WM.message("Insert","Drop the stop symbol on a terminator (nextstate)."); return; }
			this.doEdit("stop",()=>Model.setTerm(ref,"stop"));
			return;
		}
		if (created && created.id) {
			this.relayout(true);
			this.select(created.id);
			this.ensureVisible(created.id);
			const ni=this.item(created.id);
			if (ni && ni.ref && Model.canEditText(ni.ref)) setTimeout(()=>this.editItem(ni),0);
		}
	}
	dropSymbol(type,px,py) { this.dropId=null; this.applySymbol(type,this.itemAt(px,py)); }
	paletteClick(type) {
		const it=this.selectedItem();
		if (!it && type==="state") { this.applySymbol("state",null); return; }
		if (!it) { WM.message("Insert","Select a symbol in the diagram first,\nor drag the symbol onto the diagram."); return; }
		this.applySymbol(type,it);
	}
	contextMenu(it,px,py) {
		const ins=(type,cap)=>({caption:cap,action:()=>this.applySymbol(type,it),enabled:()=>!!(it&&Model.canInsert(it.ref,type))});
		const items=[];
		if (!it || !it.ref) {
			items.push({caption:"New state",action:()=>this.applySymbol("state",null)});
			items.push("-");
			items.push({caption:"Fit to window",action:()=>this.fit(),key:"0"});
			items.push({caption:"Zoom 100%",action:()=>{ this.z=1; this.ox=0; this.oy=0; invalidate(); }});
			popupMenu(items,px,py);
			return;
		}
		const ref=it.ref;
		if (Model.canEditText(ref)) items.push({caption:"Edit text",action:()=>this.editItem(it),key:"F2"});
		if (ref.kind==="state") {
			items.push({caption:"Add input",action:()=>this.applySymbol("input",it)});
			items.push({caption:"Add save",action:()=>this.applySymbol("save",it)});
		}
		if (ref.kind==="input") {
			items.push({caption:"Add input next to it",action:()=>this.applySymbol("input",it)});
		}
		if (Model.insertPoint(ref) && ref.kind!=="state") {
			items.push("-");
			items.push(ins("task","Insert task"));
			items.push(ins("output","Insert output"));
			items.push(ins("decision","Insert decision"));
			items.push(ins("create","Insert create"));
			items.push(ins("timer","Insert timer (set)"));
		}
		if (ref.kind==="action" && ref.trans.actions[ref.index].type==="decision") {
			items.push("-");
			items.push({caption:"Add branch",action:()=>this.doEdit("branch",()=>Model.addBranch(ref))});
		}
		if (ref.kind==="term") {
			items.push("-");
			const t=ref.trans.term;
			items.push({caption:"Nextstate",checked:()=>t.type==="nextstate",action:()=>{ this.doEdit("term",()=>Model.setTerm(ref,"nextstate")); }});
			items.push({caption:"Stop",checked:()=>t.type==="stop",action:()=>this.doEdit("term",()=>Model.setTerm(ref,"stop"))});
			if (t.type==="nextstate" && t.text!=="-") {
				const st=Model.findState(ref.proc,t.text);
				if (st) items.push({caption:"Go to state "+st.name,action:()=>{ this.select(st.id); this.ensureVisible(st.id,true); }});
			}
		}
		if (Model.canDelete(ref)) { items.push("-"); items.push({caption:ref.kind==="branch"?"Delete branch":"Delete",action:()=>this.deleteItem(it),key:"Del"}); }
		popupMenu(items,px,py);
	}
}

/* ------------------------------------------------------------------ */
class ProcessEditorWindow extends Window {
	constructor(proc,prect) {
		super("",prect,CLOSABLE,RESIZABLE,{closeAction:"destroy",minW:200,minH:120});
		this.class="ProcessEditorWindow";
		this.procId=proc.id;
		this.title=()=>{ const p=this.proc(); return p ? "Process "+p.name+" – editor" : "(deleted process)"; };
		this.view=this.push(new DiagramView(()=>this.proc()));
		this.layout();
	}
	proc() { return Model.project.processes.find(p=>p.id===this.procId)||null; }
	onKey(k) { return this.view.onKey(k); }
}

const Editors = {
	all() { return WM.windows().filter(w=>w instanceof ProcessEditorWindow); },
	open(proc,prect) {
		let w=this.all().find(x=>x.procId===proc.id);
		if (!w) {
			const ca=WM.root.clientArea;
			const n=this.all().length;
			w=new ProcessEditorWindow(proc,prect||new Rect(160+n*24,8+n*24,Math.min(620,ca.w-600),Math.min(560,ca.h-40)));
			ca.push(w);
		}
		w.show();
		WM.lastView=w.view;
		return w;
	},
	closeMissing() { this.all().forEach(w=>{ if (!w.proc()) w.close(); }); },
};

/* ------------------------------------------------------------------ */
class ProjectWindow extends Window {
	constructor(prect) {
		super("Project",prect,CLOSABLE,RESIZABLE,{minW:120,minH:140});
		this.class="ProjectWindow";
		this.title=()=>"Project: "+(Model.project?Model.project.name:"");
		this.list=this.push(new ListView(0,0,10,10,{
			items:()=>Model.project.processes.map(p=>({ text:p.name+"   ["+p.init+"]", data:p })),
			onDbl:(it)=>Editors.open(it.data),
			onCtx:(it,e)=>this.menu(it,e),
		}));
		this.list.fill={l:4,t:4,r:4,b:34};
		const mk=(cap,fn,tip)=>this.push(new Button(cap,0,0,0,22,fn,{tooltip:tip}));
		this.buttons=[
			mk("New",()=>newProcessDialog(),"New process"),
			mk("Open",()=>{ const p=this.current(); if (p) Editors.open(p); },"Open the editor"),
			mk("…",(e)=>{ this.menu(this.list.selected>=0?{data:this.current()}:null,{x:this.buttons[2].ax,y:this.buttons[2].ay+24}); },"More"),
		];
		this.layout();
	}
	current() { const i=this.list.selected; return i>=0 ? Model.project.processes[i]||null : null; }
	onLayout() {
		if (!this.buttons) return;
		let x=4;
		const y=this.clientArea.h-28;
		this.buttons.forEach(b=>{ b.x=x; b.y=y; x+=b.w+4; });
	}
	menu(it,e) {
		const p=it?it.data:null;
		popupMenu([
			{caption:"Open editor",enabled:()=>!!p,action:()=>Editors.open(p)},
			{caption:"Rename…",enabled:()=>!!p,action:()=>renameProcessDialog(p)},
			{caption:"Initial instances…",enabled:()=>!!p,action:()=>initDialog(p)},
			{caption:"Delete",enabled:()=>!!p,action:()=>WM.confirm("Delete process","Delete process "+p.name+"?",()=>{ Model.edit("delproc",()=>{ Model.project.processes.splice(Model.project.processes.indexOf(p),1); }); Editors.closeMissing(); })},
			"-",
			{caption:"New process…",action:()=>newProcessDialog()},
			{caption:"Rename project…",action:()=>WM.prompt("Project","Project name:",Model.project.name,(v)=>{ if (v.trim()) Model.edit("pname",()=>{ Model.project.name=v.trim(); }); })},
		],e.x,e.y);
	}
}

function newProcessDialog() {
	WM.prompt("New process","Process name:","Process",(v)=>{
		v=v.trim(); if (!v) return;
		if (!/^[A-Za-z_]\w*$/.test(v)) { WM.message("New process","The name must be an identifier (letters, digits, _)."); return; }
		const p=Model.edit("newproc",()=>Model.newProcess(v));
		if (p) Editors.open(p);
	});
}
function renameProcessDialog(p) {
	WM.prompt("Rename process","New name of "+p.name+":",p.name,(v)=>{
		v=v.trim(); if (!v || v===p.name) return;
		if (!/^[A-Za-z_]\w*$/.test(v)) { WM.message("Rename","The name must be an identifier."); return; }
		if (Model.findProc(v)) { WM.message("Rename","A process called "+v+" already exists."); return; }
		Model.edit("rename",()=>{ p.name=v; });
	});
}
function initDialog(p) {
	WM.prompt("Initial instances","Number of instances of "+p.name+" at start (0 = only created dynamically):",String(p.init),(v)=>{
		const n=parseInt(v);
		if (isNaN(n)||n<0||n>20) { WM.message("Initial instances","Give a number between 0 and 20."); return; }
		Model.edit("init",()=>{ p.init=n; });
	});
}
