import {createVotiPieChart} from "./votiPieChart.js";

// Campi che devono essere presenti nel foglio Tableau
const FIELD_GRADE = "End Course grade";
const FIELD_LAUDE = "End Course Laude";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Impossibile caricare la libreria Tableau"));
    document.head.appendChild(s);
  });
}

const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Converte la DataTable di Tableau in un array di oggetti {End_Course_grade, End_Course_Laude}
function tableauToRows(dataTable) {
  const names = dataTable.columns.map(c => c.fieldName);
  const idx = name => names.findIndex(n => norm(n).includes(norm(name)));
  const iGrade = idx(FIELD_GRADE);
  const iLaude = idx(FIELD_LAUDE);
  if (iGrade < 0 || iLaude < 0) {
    throw new Error(
      `Campi non trovati. Cerco "${FIELD_GRADE}" e "${FIELD_LAUDE}", ` +
      `ma il foglio contiene: ${names.join(", ") || "(nessuna colonna)"}`
    );
  }

  return dataTable.data.map(row => {
    const g = row[iGrade].value;
    const l = row[iLaude].value;
    const gradeIsNull = g === null || g === undefined || g === "" || g === "%null%" || Number.isNaN(+g);
    return {
      // Queste chiavi restano con gli underscore: le usa votiPieChart.js
      End_Course_grade: gradeIsNull ? null : +g,
      End_Course_Laude: l === true || l === 1 || l === "1" || String(l).toLowerCase() === "true"
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