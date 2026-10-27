// SDL Design Tool - SDL-88 graphical symbols and the symbol palette
"use strict";

const SYM_FONT = "13px Arial, Helvetica, sans-serif";

// wrap text into lines that fit maxw (explicit \n is kept)
function wrapText(ptext,maxw,font=SYM_FONT) {
	ctx.font=font;
	const out=[];
	String(ptext).split("\n").forEach(par=>{
		const words=par.split(/(\s+)/);
		let line="";
		words.forEach(wd=>{
			const t=line+wd;
			if (line!=="" && ctx.measureText(t.trimEnd()).width>maxw) { out.push(line.trim()); line=wd.trimStart(); }
			else line=t;
		});
		out.push(line.trim());
	});
	return out;
}

function symbolPath(type,x,y,w,h) {
	ctx.beginPath();
	switch (type) {
		case "start": {
			const r=Math.min(h/2,w/2);
			ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
			ctx.arc(x+w-r,y+r,r,-Math.PI/2,Math.PI/2);
			ctx.lineTo(x+r,y+h);
			ctx.arc(x+r,y+r,r,Math.PI/2,Math.PI*1.5);
			break;
		}
		case "state": case "nextstate": {
			const r=h*0.22;
			ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
			ctx.bezierCurveTo(x+w+r*0.35,y+h*0.05,x+w+r*0.35,y+h*0.95,x+w-r,y+h);
			ctx.lineTo(x+r,y+h);
			ctx.bezierCurveTo(x-r*0.35,y+h*0.95,x-r*0.35,y+h*0.05,x+r,y);
			break;
		}
		case "input": {
			const n=Math.min(h*0.4,w*0.2);
			ctx.moveTo(x,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w-n,y+h/2); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h);
			break;
		}
		case "output": {
			const n=Math.min(h*0.4,w*0.2);
			ctx.moveTo(x,y); ctx.lineTo(x+w-n,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(x+w-n,y+h); ctx.lineTo(x,y+h);
			break;
		}
		case "save": {
			const n=Math.min(h*0.4,w*0.2);
			ctx.moveTo(x+n,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w-n,y+h); ctx.lineTo(x,y+h);
			break;
		}
		case "decision":
			ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(x+w/2,y+h); ctx.lineTo(x,y+h/2);
			break;
		case "stop": {
			const r=Math.min(w,h)/2;
			ctx.arc(x+w/2,y+h/2,r,0,Math.PI*2);
			break;
		}
		case "dcl": {
			const f=Math.min(10,h/3);
			ctx.moveTo(x,y); ctx.lineTo(x+w-f,y); ctx.lineTo(x+w,y+f); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h);
			break;
		}
		default:   // task, create, timer
			ctx.rect(x,y,w,h);
	}
	ctx.closePath();
}

// st: {fill, stroke, lw, color, font, dash}
function drawSymbol(type,x,y,w,h,ptext,st={}) {
	ctx.save();
	symbolPath(type,x,y,w,h);
	ctx.fillStyle=st.fill||"#ffffff";
	ctx.fill();
	ctx.lineWidth=st.lw||1.2;
	ctx.strokeStyle=st.stroke||"#1d2126";
	ctx.setLineDash(st.dash||[]);
	ctx.stroke();
	ctx.setLineDash([]);
	if (type==="create") {
		const d=Math.min(5,h/7);
		ctx.beginPath();
		ctx.moveTo(x,y+d); ctx.lineTo(x+w,y+d);
		ctx.moveTo(x,y+h-d); ctx.lineTo(x+w,y+h-d);
		ctx.stroke();
	}
	if (type==="stop") {
		const r=Math.min(w,h)/2*0.707, cx=x+w/2, cy=y+h/2;
		ctx.beginPath();
		ctx.moveTo(cx-r,cy-r); ctx.lineTo(cx+r,cy+r);
		ctx.moveTo(cx+r,cy-r); ctx.lineTo(cx-r,cy+r);
		ctx.stroke();
	}
	if (ptext) {
		const font=st.font||SYM_FONT;
		const n=Math.min(h*0.4,w*0.2);
		let cx=x+w/2, avail=w-12;
		if (type==="input"||type==="output") { cx=x+(w-n)/2; avail=w-n-10; }
		else if (type==="save") avail=w-2*n-6;
		else if (type==="decision") avail=w*0.64;
		const lines=wrapText(ptext,avail,font);
		const lh=(parseInt(font.replace(/^\D+/,""))||13)*1.2;
		let ty=y+h/2-(lines.length-1)*lh/2;
		ctx.font=font;
		ctx.fillStyle=st.color||"#111";
		ctx.textAlign=type==="dcl"?"left":"center";
		ctx.textBaseline="middle";
		lines.forEach(l=>{ ctx.fillText(l,type==="dcl"?x+6:cx,ty+1); ty+=lh; });
	}
	ctx.restore();
}

/* ------------------------------------------------------------------ */
/* palette window (was ShapeBar in 2019)                               */
/* ------------------------------------------------------------------ */
const PALETTE = [
	{ type:"state",    label:"State",    tip:"State (drop on background) / nextstate (drop on a terminator)" },
	{ type:"input",    label:"Input",    tip:"Input signal (drop on a state or an input)" },
	{ type:"save",     label:"Save",     tip:"Save signals in a state" },
	{ type:"task",     label:"Task",     tip:"Task: x := expr; x++; ..." },
	{ type:"output",   label:"Output",   tip:"Output: SIG(args) to pid" },
	{ type:"decision", label:"Decision", tip:"Decision: expression ?" },
	{ type:"create",   label:"Create",   tip:"Create a process instance" },
	{ type:"timer",    label:"Timer",    tip:"set(now+5, T) / reset(T)" },
	{ type:"stop",     label:"",         tip:"Stop (drop on a terminator)" },
];

class PaletteItem extends Area {
	constructor(pitem,px,py,pw,ph) {
		super(px,py,pw,ph);
		this.class="PaletteItem";
		this.item=pitem;
		this.tooltip=pitem.tip;
		this.cursor="grab";
	}
	paint() {
		if (this.isHover()) c.fillRect(this.ax,this.ay,this.w,this.h,THEME.buttonHi);
		const sw=this.w-34, sh=this.h-12;
		const t=this.item.type;
		const dt= t==="timer"?"task":t;
		if (t==="stop") drawSymbol("stop",this.ax+this.w/2-sh/2,this.ay+6,sh,sh,"");
		else drawSymbol(dt,this.ax+17,this.ay+6,sw,sh,this.item.label,{font:"12px Arial"});
	}
	processEvent(pevt) {
		if (pevt.type!==e_down || pevt.button!==0) return pevt.type===e_up;
		const item=this.item, sx=pevt.x, sy=pevt.y;
		let moved=false;
		WM.drag={ type:item.type, x:pevt.x, y:pevt.y, paint:(x,y)=>{
			if (!moved) return;
			ctx.save(); ctx.globalAlpha=0.7;
			if (item.type==="stop") drawSymbol("stop",x-14,y-14,28,28,"");
			else drawSymbol(item.type==="timer"?"task":item.type,x-50,y-18,100,36,item.label);
			ctx.restore();
		}};
		WM.setCapture({
			cursor:"grabbing",
			move:(e)=>{
				if (Math.abs(e.x-sx)+Math.abs(e.y-sy)>4) moved=true;
				WM.drag.x=e.x; WM.drag.y=e.y;
				const v=viewAt(e.x,e.y);
				if (this.dropView && this.dropView!==v) this.dropView.dropId=null;
				this.dropView=v;
				if (v) { const it=v.itemAt(e.x,e.y); v.dropId=it&&it.ref?it.id:null; }
			},
			up:(e)=>{
				WM.drag=null;
				if (this.dropView) { this.dropView.dropId=null; this.dropView=null; }
				if (!moved) { if (WM.lastView) WM.lastView.paletteClick(item.type); return; }
				const a=viewAt(e.x,e.y);
				if (a) a.dropSymbol(item.type,e.x,e.y);
			},
		});
		return true;
	}
}

// the editable diagram view under a screen point (null if none)
function viewAt(px,py) {
	let a=WM.root.hit(px,py);
	while (a && !(a instanceof DiagramView)) a=a.father;
	return a && !a.readOnly ? a : null;
}

class ShapeBar extends Window {
	constructor(px,py,pclosable=CLOSABLE,presizable=NOTRESIZABLE) {
		const ih=40, w=130;
		super("Symbols",new Rect(px,py,w,ddhead+PALETTE.length*ih+8),pclosable,presizable,{minW:w});
		PALETTE.forEach((it,i)=>this.push(new PaletteItem(it,0,4+i*ih,w,ih)));
	}
}
