// SDL Design Tool - automatic layout of a process diagram
//
// start group:  DCL box, start symbol, transition
// state group:  state symbol, a bus, the inputs/saves side by side, each input's transition below
// decision:     first branch continues straight down, the other branches to the right
// Every drawn symbol carries a ref (see Model editing) so the editor knows what was clicked.
"use strict";

const LAY = { SW:132, SH:44, VG:22, CW:176, STOP:30, GAP:36, TOP:44, LEFT:24, ROWW:1300 };

function layoutProcess(proc) {
	const L=LAY;
	const items=[];
	const byId=new Map();
	const sym=(type,x,y,w,h,text,id,ref)=>{ const it={kind:"sym",type,x,y,w,h,text,id,ref}; items.push(it); if (id) byId.set(id,it); return it; };
	const line=(pts,arrow=false)=>items.push({kind:"line",pts,arrow});
	const label=(text,x,y,align,id,ref)=>{
		const w=Math.max(24,c.measure(text,"12px Arial")+6), h=16;
		const it={kind:"label",text,x:align==="right"?x-w:x,y:y-h/2,w,h,align,id,ref};
		items.push(it); if (id) byId.set(id,it); return it;
	};
	const width=(trans)=>{
		const a=trans.actions, last=a[a.length-1];
		if (last && last.type==="decision") return last.branches.reduce((s,b)=>s+width(b.trans),0)||1;
		return 1;
	};
	const place=(trans,x0,y)=>{
		const cx=x0+L.CW/2;
		for (let i=0;i<trans.actions.length;i++) {
			const a=trans.actions[i];
			const ref={kind:"action",proc,trans,index:i};
			line([cx,y,cx,y+L.VG]);
			y+=L.VG;
			if (a.type!=="decision") { sym(a.type,cx-L.SW/2,y,L.SW,L.SH,a.text,a.id,ref); y+=L.SH; continue; }
			const dw=L.SW+14, dh=L.SH+10;
			sym("decision",cx-dw/2,y,dw,dh,a.text,a.id,ref);
			const ymid=y+dh/2, yb=y+dh;
			let bx=x0, maxy=yb;
			a.branches.forEach((b,bi)=>{
				const bw=width(b.trans), bcx=bx+L.CW/2;
				const bref={kind:"branch",proc,decision:a,trans,index:bi};
				if (bi===0) label(b.answer,cx+6,yb+10,"left",b.id,bref);
				else {
					line([cx+dw/2,ymid,bcx,ymid,bcx,yb]);
					label(b.answer,bcx+6,ymid+10,"left",b.id,bref);
				}
				maxy=Math.max(maxy,place(b.trans,bx,yb));
				bx+=bw*L.CW;
			});
			return maxy;
		}
		const t=trans.term;
		if (t) {
			const ref={kind:"term",proc,trans};
			line([cx,y,cx,y+L.VG],true);
			y+=L.VG;
			if (t.type==="stop") { sym("stop",cx-L.STOP/2,y,L.STOP,L.STOP,"",t.id,ref); y+=L.STOP; }
			else { sym("nextstate",cx-L.SW/2,y,L.SW,L.SH,t.text,t.id,ref); y+=L.SH; }
		}
		return y;
	};

	// groups: start first, then states in order; wrap into rows
	const groups=[];
	groups.push({ cols:width(proc.start.trans), draw:(gx,gy)=>{
		const cx=gx+L.CW/2;
		const dclText="DCL "+(proc.dcl&&proc.dcl.trim()?proc.dcl.trim():"-");
		const lines=wrapText(dclText,L.SW-12).length;
		const dh=Math.max(26,lines*16+10);
		sym("dcl",cx-L.SW/2,gy,L.SW,dh,dclText,proc.id+":dcl",{kind:"dcl",proc});
		const sy=gy+dh+16;
		sym("start",cx-L.SW/2,sy,L.SW,L.SH,"",proc.start.id,{kind:"start",proc});
		return place(proc.start.trans,gx,sy+L.SH);
	}});
	proc.states.forEach(st=>{
		const cols=st.inputs.reduce((s,e)=>s+(e.type==="input"?width(e.trans):1),0)||1;
		groups.push({ cols, draw:(gx,gy)=>{
			const gcx=gx+cols*L.CW/2;
			sym("state",gcx-L.SW/2,gy,L.SW,L.SH,st.name,st.id,{kind:"state",proc,state:st});
			let maxy=gy+L.SH;
			if (!st.inputs.length) {
				label("(no input)",gcx,gy+L.SH+12,"center");
				return gy+L.SH+22;
			}
			const busY=gy+L.SH+L.VG/2;
			const iy=gy+L.SH+L.VG;
			let ix=gx;
			const centers=[];
			st.inputs.forEach((e,k)=>{
				const w=e.type==="input"?width(e.trans):1;
				const icx=ix+L.CW/2;
				centers.push(icx);
				const ref={kind:"input",proc,state:st,index:k};
				sym(e.type,icx-L.SW/2,iy,L.SW,L.SH,e.text,e.id,ref);
				line([icx,busY,icx,iy]);
				const y=e.type==="input"?place(e.trans,ix,iy+L.SH):iy+L.SH;
				maxy=Math.max(maxy,y);
				ix+=w*L.CW;
			});
			line([gcx,gy+L.SH,gcx,busY]);
			if (centers.length>1 || centers[0]!==gcx) line([Math.min(centers[0],gcx),busY,Math.max(centers[centers.length-1],gcx),busY]);
			return maxy;
		}});
	});

	let x=L.LEFT, y=L.TOP, rowH=0, maxW=0;
	groups.forEach(g=>{
		const gw=g.cols*L.CW;
		if (x>L.LEFT && x+gw>L.ROWW) { x=L.LEFT; y+=rowH+L.GAP*1.5; rowH=0; }
		const bottom=g.draw(x,y);
		rowH=Math.max(rowH,bottom-y);
		x+=gw+L.GAP;
		maxW=Math.max(maxW,x);
	});
	const W=Math.max(maxW+L.LEFT-L.GAP,360), H=y+rowH+L.GAP;
	// process frame with its name, like on paper
	items.unshift({kind:"frame",x:6,y:6,w:W-12,h:H-12,text:"PROCESS "+proc.name+(parseInt(proc.init)!==1?"  ("+proc.init+")":"")});
	return { items, byId, w:W, h:H };
}

function paintLayout(lay,pst={}) {
	// pst: {selectedId, curId, stateName, errorId, dropId, hoverId, dimmed}
	lay.items.forEach(it=>{
		switch (it.kind) {
			case "frame":
				ctx.save();
				ctx.strokeStyle="#9aa3ad"; ctx.lineWidth=1;
				ctx.strokeRect(it.x+0.5,it.y+0.5,it.w,it.h);
				ctx.font="bold 13px Arial"; ctx.fillStyle="#3a4048"; ctx.textAlign="left"; ctx.textBaseline="middle";
				ctx.fillText(it.text,it.x+10,it.y+14);
				ctx.restore();
				break;
			case "line": {
				ctx.save();
				ctx.strokeStyle="#2b3036"; ctx.lineWidth=1.2;
				ctx.beginPath();
				ctx.moveTo(it.pts[0],it.pts[1]);
				for (let i=2;i<it.pts.length;i+=2) ctx.lineTo(it.pts[i],it.pts[i+1]);
				ctx.stroke();
				if (it.arrow) {
					const n=it.pts.length, x=it.pts[n-2], y=it.pts[n-1];
					ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y-8); ctx.lineTo(x+4,y-8); ctx.closePath();
					ctx.fillStyle="#2b3036"; ctx.fill();
				}
				ctx.restore();
				break;
			}
			case "label": {
				const sel=it.id && it.id===pst.selectedId;
				if (sel) { ctx.fillStyle="#dbe7f7"; ctx.fillRect(it.x,it.y,it.w,it.h); }
				if (it.id && it.id===pst.curId) { ctx.fillStyle="#ffe58a"; ctx.fillRect(it.x,it.y,it.w,it.h); }
				ctx.font="12px Arial"; ctx.fillStyle=it.ref?"#1f4f8a":"#8a9099"; ctx.textBaseline="middle";
				ctx.textAlign=it.align==="center"?"center":"left";
				ctx.fillText(it.text,it.align==="center"?it.x+it.w/2:it.x+3,it.y+it.h/2+1);
				break;
			}
			case "sym": {
				const st={};
				const isState=(it.type==="state") && pst.stateName && it.text.toLowerCase()===String(pst.stateName).toLowerCase();
				if (isState) st.fill="#d7f0d2";
				if (it.id===pst.curId) { st.fill="#ffe58a"; st.lw=2.2; st.stroke="#b07d00"; }
				if (it.id===pst.errorId) { st.fill="#ffd6d6"; st.stroke="#c01818"; st.lw=2.2; }
				if (it.id===pst.dropId) { st.fill="#e3f0ff"; st.stroke=THEME.select; st.lw=2; }
				if (it.id===pst.selectedId) { st.stroke=THEME.select; st.lw=2.4; }
				if (it.type==="dcl") { st.font="12px Consolas, 'Courier New', monospace"; st.fill=st.fill||"#fbfbf4"; }
				drawSymbol(it.type,it.x,it.y,it.w,it.h,it.text,st);
				break;
			}
		}
	});
}

function hitLayout(lay,x,y) {
	for (let i=lay.items.length-1;i>=0;i--) {
		const it=lay.items[i];
		if ((it.kind==="sym"||(it.kind==="label"&&it.ref)) && x>=it.x-2 && x<=it.x+it.w+2 && y>=it.y-2 && y<=it.y+it.h+2) return it;
	}
	return null;
}
