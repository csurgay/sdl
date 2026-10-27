// SDL Design Tool - main: workspace, menus, startup
// 2019-2026 Peter Csurgay
"use strict";

initCanvas("mycanvas");
installInput();
var workspace=WM.init("SDL-88 Design Tool – Workspace – 2019-2026 Peter Csurgay");
var sdlLogo=new Image();
sdlLogo.src="images.png";

/* ---------------- windows ---------------- */
var shapeBar=new ShapeBar(8,8);
workspace.push(shapeBar);
var projectWindow=new ProjectWindow(new Rect(8,shapeBar.h+16,130,220));
workspace.push(projectWindow);
var simWindow=new SimWindow(new Rect(800,8,440,330));
workspace.push(simWindow);
var mscWindow=new MscWindow(new Rect(800,346,440,380));
workspace.push(mscWindow);

// the 2019 debug window: mouse x,y
var xyWindow=new Window("x,y",new Rect(300,300,120,60),CLOSABLE,NOTRESIZABLE);
xyWindow.push(new Label(()=>WM.mouse.x+", "+WM.mouse.y,8,8,100,20,{font:THEME.fontMono}));
xyWindow.visible=false;
workspace.push(xyWindow);
WM.allEvents.push(()=>{ if (xyWindow.visible) invalidate(); });

/* ---------------- menus ---------------- */
var mainmenu=new MenuBar();
workspace.addMenu(mainmenu);

var filemenu=mainmenu.addMenu("File");
filemenu.add("New project",()=>WM.confirm("New project","Discard the current project and start a new one?",()=>{
	loadProject({format:"sdl-tool/1",name:"Untitled",processes:[]});
	const p=Model.edit("newproc",()=>Model.newProcess("Process"));
	Editors.open(p);
}));
filemenu.add("Open…",()=>openFile(),{key:"Ctrl+O"});
filemenu.add("Save",()=>saveFile(),{key:"Ctrl+S"});
filemenu.add("-");
EXAMPLES.forEach(ex=>filemenu.add("Example: "+ex.name,()=>loadProject(ex.make())));
filemenu.add("-");
filemenu.add("Export MSC (sequencediagram.org)…",()=>exportMsc());

var editmenu=mainmenu.addMenu("Edit");
editmenu.add("Undo",()=>Model.undo(),{key:"Ctrl+Z",enabled:()=>Model.undoStack.length>0});
editmenu.add("Redo",()=>Model.redo(),{key:"Ctrl+Y",enabled:()=>Model.redoStack.length>0});
editmenu.add("-");
editmenu.add("Edit text",()=>{ const v=WM.lastView, it=v&&v.selectedItem(); if (it) v.editItem(it); },{key:"F2",enabled:()=>!!(WM.lastView&&WM.lastView.selectedItem())});
editmenu.add("Delete",()=>{ const v=WM.lastView, it=v&&v.selectedItem(); if (it) v.deleteItem(it); },{key:"Del",enabled:()=>!!(WM.lastView&&WM.lastView.selectedItem())});
editmenu.add("New state",()=>{ if (WM.lastView) WM.lastView.applySymbol("state",null); },{enabled:()=>!!WM.lastView});

var processmenu=mainmenu.addMenu("Process");
processmenu.build=(m)=>{
	m.add("New process…",()=>newProcessDialog());
	m.add("-");
	Model.project.processes.forEach(p=>m.add("Edit "+p.name,()=>Editors.open(p)));
	const cur=WM.lastView && WM.lastView.proc();
	if (cur) {
		m.add("-");
		m.add("Rename "+cur.name+"…",()=>renameProcessDialog(cur));
		m.add("Initial instances of "+cur.name+"…",()=>initDialog(cur));
	}
};

var simmenu=mainmenu.addMenu("Simulation");
simmenu.add("Reset",()=>SimCtl.reset(),{key:"F9"});
simmenu.add("Step",()=>SimCtl.step(),{key:"F10"});
simmenu.add("Step transition",()=>SimCtl.stepTransition(),{key:"Shift+F10"});
simmenu.add("Run / Pause",()=>SimCtl.run(),{key:"F8",checked:()=>SimCtl.running});
simmenu.add("Slower",()=>SimCtl.slower());
simmenu.add("Faster",()=>SimCtl.faster());
simmenu.add("-");
simmenu.add("Send signal from env…",()=>{ simWindow.show(); simWindow.envField.edit(); });
simmenu.add("Signal animation",()=>{ SimAnim.enabled=!SimAnim.enabled; },{checked:()=>SimAnim.enabled});

var windowmenu=mainmenu.addMenu("Window");
windowmenu.build=(m)=>{
	m.add("Default arrangement",()=>arrangeDefault());
	m.add("Tile editors",()=>tileWindows(Editors.all()));
	m.add("Tile process instances",()=>tileWindows([...SimCtl.windows.values()].filter(w=>w.visible)));
	m.add("Collapse all instances",()=>SimCtl.windows.forEach(w=>{ if (!w.collapsed) w.toggleCollapse(); }));
	m.add("-");
	WM.windows().filter(w=>w!==xyWindow && !(w instanceof InstanceWindow)).forEach(w=>{
		const t=typeof w.title==="function"?w.title():w.title;
		m.add(t,()=>w.show(),{checked:()=>w.visible});
	});
	if (SimCtl.windows.size) {
		m.add("-");
		SimCtl.windows.forEach(w=>m.add(w.title(),()=>w.show(),{checked:()=>w.visible}));
	}
	m.add("-");
	m.add("Debug: mouse x,y",()=>{ if (xyWindow.visible) xyWindow.close(); else xyWindow.show(); },{checked:()=>xyWindow.visible});
};

var helpmenu=mainmenu.addMenu("Help");
helpmenu.add("Usage…",()=>WM.message("Usage",[
	"EDITOR",
	"  drag a symbol from Symbols onto a diagram symbol: inserted after it",
	"  or select a diagram symbol and click a palette symbol",
	"  double click / F2: edit text,  Del: delete,  right click: menu",
	"  State on the background: new state;  on a nextstate: change it",
	"  wheel: scroll,  Ctrl+wheel: zoom,  drag background: pan,  0: fit",
	"  Ctrl+Z / Ctrl+Y: undo / redo,  Ctrl+S: save,  Ctrl+O: open",
	"",
	"TEXT IN THE SYMBOLS",
	"  task:      n := 0;  n++;  set(now+5, T);  reset(T)",
	"  output:    SIG(a, b) to offspring      (to: self sender parent",
	"             offspring env, an instance or process name)",
	"  input:     SIG(x, y)  – parameters are stored in variables",
	"  decision:  n = m ?   branches: true / false / 3 / >5 / else",
	"  DCL box:   n, m, s := 'abc'",
	"",
	"SIMULATION",
	"  F9 reset,  F10 step,  Shift+F10 transition,  F8 run / pause",
	"  env line in the Simulator window:  GUESS(3) to GAME1",
].join("\n"),560));
helpmenu.add("About…",()=>WM.message("About","SDL-88 Design Tool\nEditor and simulator for SDL process diagrams.\nPure canvas window system.\n\n2019-2026 Peter Csurgay"));

/* ---------------- keys ---------------- */
WM.addKey("z",()=>Model.undo(),true);
WM.addKey("y",()=>Model.redo(),true);
WM.addKey("z",()=>Model.redo(),true,true);
WM.addKey("s",()=>saveFile(),true);
WM.addKey("o",()=>openFile(),true);
WM.addKey("F8",()=>SimCtl.run());
WM.addKey("F9",()=>SimCtl.reset());
WM.addKey("F10",()=>SimCtl.step());
WM.addKey("F10",()=>SimCtl.stepTransition(),false,true);

/* ---------------- files ---------------- */
function loadProject(p) {
	Editors.all().forEach(w=>w.close());
	Model.load(p);
	Model.project.processes.forEach(pr=>Editors.open(pr));
	arrangeDefault();
}
function saveFile() {
	WM.commitEdit();
	download((Model.project.name||"project").replace(/\W+/g,"_")+".sdl.json",Model.toJSON());
}
function openFile() {
	const inp=document.createElement("input");
	inp.type="file"; inp.accept=".json,.sdl,application/json";
	inp.onchange=()=>{
		const f=inp.files[0]; if (!f) return;
		f.text().then(t=>{
			try { loadProject(Model.fromJSON(t)); }
			catch(e) { WM.message("Open","Cannot open "+f.name+":\n"+e.message); }
		});
	};
	inp.click();
}

/* ---------------- window arrangement ---------------- */
function tileWindows(list,x0,y0,x1,y1) {
	const ca=workspace.clientArea;
	if (x0===undefined) {
		// the area between the palette column and the simulator column
		x0=148; y0=8; y1=ca.h-8;
		x1=(simWindow.visible && simWindow.x>x0+300) ? simWindow.x-8 : ca.w-8;
	}
	const n=list.length; if (!n) return;
	const cols=n<=3?n:Math.ceil(Math.sqrt(n)), rows=Math.ceil(n/cols);
	const w=Math.floor((x1-x0-(cols-1)*8)/cols), h=Math.floor((y1-y0-(rows-1)*8)/rows);
	list.forEach((win,i)=>{
		win.visible=true;
		if (win.collapsed) win.toggleCollapse();
		win.moveTo(x0+(i%cols)*(w+8),y0+Math.floor(i/cols)*(h+8));
		win.setSize(w,h);
		win.activate();
	});
	list.forEach(win=>{ if (win.view && win.view.fit) win.view.fit(); });
}
function arrangeDefault() {
	const ca=workspace.clientArea;
	const W=ca.w, H=ca.h;
	shapeBar.show(); shapeBar.moveTo(8,8);
	projectWindow.show(); projectWindow.moveTo(8,shapeBar.h+16);
	projectWindow.setSize(130,Math.max(150,H-shapeBar.h-24));
	const R=Math.max(360,Math.min(480,Math.round(W*0.3)));
	simWindow.show(); simWindow.moveTo(W-R-8,8); simWindow.setSize(R,Math.round(H*0.42));
	mscWindow.show(); mscWindow.moveTo(W-R-8,simWindow.h+16); mscWindow.setSize(R,H-simWindow.h-24);
	tileWindows(Editors.all(),148,8,W-R-16,H-8);
}

/* ---------------- start ---------------- */
Model.listeners.push((what)=>{
	if (["load","undo","redo","error"].includes(what)) { Editors.closeMissing(); if (SimCtl.sim) SimCtl.reset(); }
	invalidate();
});
(function start() {
	let p=null;
	try { const s=localStorage.getItem("sdl-tool-project"); if (s) p=Model.fromJSON(s); } catch(e) { p=null; }
	Model.load(p||exampleGuessingGame());
	SimCtl.init();
	SimCtl.win=simWindow; SimCtl.msc=mscWindow;
	Model.project.processes.forEach(pr=>Editors.open(pr));
	arrangeDefault();
	SimCtl.reset();
	projectWindow.activate();
})();
