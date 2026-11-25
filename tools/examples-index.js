// Writes examples/index.json: the list of the *.sdl.json files in examples/.
// The tool reads this list to build the File / Example menu, because a plain
// web server cannot list a directory. Run it after adding or removing an example:
//      node tools/examples-index.js
"use strict";
const fs=require("fs"), path=require("path");
const dir=path.join(__dirname,"..","examples");
const files=fs.readdirSync(dir).filter(f=>/\.sdl\.json$/i.test(f)).sort((a,b)=>a.localeCompare(b));
fs.writeFileSync(path.join(dir,"index.json"),JSON.stringify(files,null,1)+"\n");
console.log("examples/index.json: "+files.length+" example(s)");
files.forEach(f=>console.log("  "+f));
