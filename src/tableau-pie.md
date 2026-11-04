---
sidebar: false
header: false
footer: false
toc: false
---

```js
import {startTableauPie} from "./components/tableauExtension.js";

const libUrl = await FileAttachment("tableau.extensions.1.latest.min.js").url();
const container = html`<div></div>`;
display(container);

startTableauPie(container, {
  libUrl,
  worksheetName: "Studenti"   // <-- nome del foglio Tableau che fornisce i dati
});
```