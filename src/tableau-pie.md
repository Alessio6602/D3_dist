---
theme: light
sidebar: false
header: false
footer: false
toc: false
pager: false
---

<style>
  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; } 
  #observablehq-center { margin: 0; padding: 0; }
  #observablehq-main { max-width: none; margin: 0; padding: 8px; }
  #chart {
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 16px);
  }
  #chart svg {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100%;
  }
</style>


```js
import {startTableauPie} from "./components/tableauExtension.js"; // script da caricare

const libUrl = await FileAttachment("tableau.extensions.1.latest.min.js").url(); 
// file che apre il canale di comunicazione con tableau
const container = html`<div></div>`;
display(container);

startTableauPie(container, {
  libUrl,
  worksheetName: "Studenti"  // foglio Tableau
});
```