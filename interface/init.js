import { render } from "lit-html";
import { createListener } from "./createListener.js";
import { addPanZoom } from "./addPanZoom.js";
import { view } from "./view.js";
import { runCode, runMachineHelper } from "./runCode.js";
import { runCommand } from "./runCommand.js";
import { addCaching } from "./addCaching.js";
import { addDropUpload } from "./addDropUpload.js";
import { addNumberDragging } from "./addNumberDragging.js";
import { downloadText } from "./download.js";

import { EditorView, basicSetup } from "codemirror"
import { keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript"
import { indentUnit } from "@codemirror/language";
import { indentWithTab } from "@codemirror/commands";

import { createHaxidraw } from "./haxidraw/createHaxidraw.js";

export function init(state) {

  const r = () => render(view(state), document.body);
  const execute = () => {
    const code = editor.state.doc.toString();   
    runCode(code, state).then(() => r());
  }

  state.execute = execute;
  state.render = r;
  r();
  
  const root = document.querySelector(".root");

  const panZoom = addPanZoom(root.querySelector("svg"));

  panZoom.setScaleXY({
    x: [-5, 5],
    y: [-5, 5]
  });

  const editorContainer = document.querySelector(".dictionary");

  const extensions = [
    basicSetup, 
    javascript(),
    keymap.of([indentWithTab]),
    indentUnit.of("  ")
  ]

  const editor = new EditorView({
    extensions,
    parent: editorContainer
  })

  state.codemirror = editor;

  addCaching(state);
  addDropUpload(root, state);
  addNumberDragging(root, state);

  root.addEventListener("keydown", e => {
    const isEnter = e.keyCode === 13;
    const activeEl = document.activeElement;
    const isCmd = activeEl.matches(".line-input");
    if (isCmd && isEnter) {
      const cmd = activeEl.innerText;
      runCommand(cmd, state).then(() => r());
      activeEl.innerText = "";
      e.preventDefault();
    };

    if (e.keyCode === 13 && e.shiftKey) {
      const code = editor.state.doc.toString();   
      runCode(code, state).then(() => r());
      e.preventDefault();
    }
  })

  const listener = createListener(root);

  /* <button class="set-origin-trigger">set origin</button> */

  // listener("click", ".set-origin-trigger", () => {
  //   if (!machine) return;
  //   machine.setPosition([0, 0]); 
  // });

  listener("click", ".run-trigger", () => {
    const code = editor.state.doc.toString();   
    runCode(code, state).then(() => r());
  });

  listener("click", ".run-machine-trigger", () => {
    const runMachine = () => runMachineHelper(state, [state.scaleX, state.scaleY]);

    const code = editor.state.doc.toString();   
    runCode(code, state).then(() => {
      r();
      if (!state.haxidraw) {
        console.log("not connected");
        return;
      }
      runMachine();
    });
  });

  listener("click", ".connect-trigger", async () => {
    if (!navigator.serial) {
      alert(
        "🚨 Your browser doesn't seem to support the Web Serial API, which is required for the Haxidraw editor to connect to the machine. Chrome Version 89 or above is the recommended browser."
      ) 
    }
    if (!state.haxidraw) { // connect
      navigator.serial
        .requestPort({ filters: [] })
        .then(async (port) => {
          console.log("connecting");
          state.haxidraw = await createHaxidraw(port);
          console.log(state.haxidraw);
          r();
        })
        .catch((e) => {
          // The user didn't select a port.
        }); 
    } else { // disconnect
      console.log("disconnecting");
      await state.haxidraw.port.close();
      state.haxidraw = null;
      r();
    }

  });

  listener("click", ".save-trigger", () => {
    const code = editor.state.doc.toString();
    downloadText(`${state.filename}.js`, code);
  });

  listener("click", ".filename-trigger", () => {
    let newName = prompt("Please provide a new filename.", state.filename);
    // if (newName !== null) newName = newName.replaceAll(/\s/g, "-");
    if (newName !== "" && newName !== null) state.filename = newName;
    r();
  });

  automaticallyConnect(state);

}


async function automaticallyConnect(state) {
  const ports = await navigator.serial.getPorts();

  ports.forEach(async (port) => {
    const info = port.getInfo();

    if (info.usbVendorId === 11914) {
      state.haxidraw = await createHaxidraw(port);
      state.render();
    }
  })

}




