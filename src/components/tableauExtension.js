import {createVotiPieChart} from "./votiPieChart.js"; // file che genera il grafico a ciambella

// Campi raccolti dal foglio Studenti
const FIELD_GRADE = "Voto";
const FIELD_LAUDE = "End_Course_Laude";
const FIELD_STUDENT = "Student ID";

//Carica la libreria Tableau
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

function findCol(names, name) {
  const target = norm(name);
  const exact = names.findIndex(n => norm(n) === target);
  return exact >= 0 ? exact : names.findIndex(n => norm(n).includes(target));
}

// Converte la DataTable in un array di oggetti, UNA riga per studente
function tableauToRows(dataTable) {
  const names = dataTable.columns.map(c => c.fieldName);
  const iGrade = findCol(names, FIELD_GRADE);
  const iLaude = findCol(names, FIELD_LAUDE);
  const iStudent = findCol(names, FIELD_STUDENT);

  if (iGrade < 0 || iLaude < 0 || iStudent < 0) {
    throw new Error(
      `Campi non trovati. Cerco "${FIELD_GRADE}", "${FIELD_LAUDE}" e "${FIELD_STUDENT}", ` +
      `ma il foglio contiene: ${names.join(", ") || "(nessuna colonna)"}`
    );
  }

  const isNull = v => v === null || v === undefined || v === "" || v === "%null%";
  const rows = [];
  const seen = new Set(); // ID studente gia inseriti

  for (const row of dataTable.data) {
    const id = row[iStudent].value;

    // Ogni riga e' un esame: tengo solo la prima riga di ciascuno studente
    if (!isNull(id)) {
      if (seen.has(id)) continue;
      seen.add(id);
    }

  const g = row[iGrade].value;
    const l = row[iLaude].value;
    rows.push({
      End_Course_grade: isNull(g) || Number.isNaN(+g) ? null : +g,
      End_Course_Laude: l === true || l === 1 || l === "1" || String(l).toLowerCase() === "true"
    });
  }
  return rows;
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