import {createVotiPieChart} from "./votiPieChart.js";

// Campi che devono essere presenti nel foglio Tableau
const FIELD_GRADE = "End_Course_grade";
const FIELD_LAUDE = "End_Course_Laude";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Impossibile caricare la libreria Tableau"));
    document.head.appendChild(s);
  });
}

// Converte la DataTable di Tableau in un array di oggetti {End_Course_grade, End_Course_Laude}
function tableauToRows(dataTable) {
  const idx = name => dataTable.columns.findIndex(c => c.fieldName.includes(name));
  const iGrade = idx(FIELD_GRADE);
  const iLaude = idx(FIELD_LAUDE);
  if (iGrade < 0 || iLaude < 0) {
    throw new Error(`Nel foglio mancano i campi ${FIELD_GRADE} e/o ${FIELD_LAUDE}`);
  }

  return dataTable.data.map(row => {
    const g = row[iGrade].value;
    const l = row[iLaude].value;
    const gradeIsNull = g === null || g === undefined || g === "%null%" || g === "";
    return {
      [FIELD_GRADE]: gradeIsNull ? null : +g,
      [FIELD_LAUDE]: l === true || String(l).toLowerCase() === "true"
    };
  });
}

export async function startTableauPie(container, {libUrl, worksheetName}) {
  container.textContent = "Connessione a Tableau…";

  try {
    await loadScript(libUrl);
    await tableau.extensions.initializeAsync();
  } catch (err) {
    container.textContent = "Questa pagina funziona solo dentro una dashboard Tableau. " + err.message;
    return;
  }

  const dashboard = tableau.extensions.dashboardContent.dashboard;
  const worksheet = dashboard.worksheets.find(w => w.name === worksheetName);
  if (!worksheet) {
    container.textContent = `Foglio "${worksheetName}" non trovato. Fogli disponibili: ` +
      dashboard.worksheets.map(w => w.name).join(", ");
    return;
  }

  async function refresh() {
    try {
      const table = await worksheet.getSummaryDataAsync({ignoreSelection: true});
      const rows = tableauToRows(table);
      container.replaceChildren(createVotiPieChart(rows, {width: 500, height: 400}));
    } catch (err) {
      container.textContent = err.message;
    }
  }

  await refresh();

  // Aggiorna il grafico quando cambiano i filtri della dashboard
  worksheet.addEventListener(tableau.TableauEventType.FilterChanged, refresh);
}