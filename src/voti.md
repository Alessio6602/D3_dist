# Distribuzione Carriere Studenti

```js
import { createVotiPieChart } from "./components/votiPieChart.js";

const workbook = await FileAttachment("./data/data_studenti.xlsx").xlsx();
const data = await workbook.sheet(0, {headers: true, type:true});

display(createVotiPieChart(data)); //grafico donut

