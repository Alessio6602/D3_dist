import {createViolinPlot} from "./violinPlot.js";

// Campi raccolti dal foglio Studenti
const FIELD_TEMPO = "Days End Class Exam Done";
const FIELD_ESAME = "Esame";
const FIELD_STUDENTE = "Student ID";

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

// Cerca la colonna: prima il nome identico, poi un nome che lo contiene (es. "MEDIA(...)")
function findColumn(names, field) {
  const target = norm(field);
  const exact = names.findIndex(n => norm(n) === target);
  return exact >= 0 ? exact : names.findIndex(n => norm(n).includes(target));
}

// Converte la DataTable di Tableau in un array di oggetti {esame, studente, tempo}
function tableauToRows(dataTable) {
  const names = dataTable.columns.map(c => c.fieldName);
  const iTempo = findColumn(names, FIELD_TEMPO);
  const iEsame = findColumn(names, FIELD_ESAME);
  const iStudente = findColumn(names, FIELD_STUDENTE);
  if (iTempo < 0 || iEsame < 0 || iStudente < 0) {
    throw new Error( // Messaggio di errore se non trova i campi richiesti
      `Campi non trovati. Cerco "${FIELD_TEMPO}", "${FIELD_ESAME}" e "${FIELD_STUDENTE}", ` +
      `ma il foglio contiene: ${names.join(", ") || "(nessuna colonna)"}`
    );
  }
  // campi passati al grafico violinPlot.js: {esame, studente, tempo}
  return dataTable.data
    .map(row => ({
      tempo: parseFloat(row[iTempo].value),   // "%null%" diventa NaN e viene scartato
      esame: String(row[iEsame].value),
      studente: String(row[iStudente].value)
    }))
    .filter(d => Number.isFinite(d.tempo));
}

export async function startTableauViolin(container, {libUrl, worksheetName, bandwidth = 120, tempoMin = -1000}) {
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

  let seq = 0; 
  // scarta le risposte arrivate in ritardo se i filtri cambiano in fretta
  // dovuto alla pesantezza del calcolo della stima di densità con kernel di Epanechnikov
  async function refresh() {
    const mine = ++seq;
    try {
      const table = await worksheet.getSummaryDataAsync({ignoreSelection: true});
      if (mine !== seq) return;
      const rows = tableauToRows(table);
      container.replaceChildren(createViolinPlot(rows, {width: 900, height: 520, bandwidth, tempoMin}));
    } catch (err) {
      if (mine === seq) container.textContent = err.message;
    }
  }

  await refresh();

  // Aggiorna il grafico quando cambiano i filtri o i parametri della dashboard 
  const T = tableau.TableauEventType;
  worksheet.addEventListener(T.FilterChanged, refresh);
  if (T.SummaryDataChanged) worksheet.addEventListener(T.SummaryDataChanged, refresh);
  for (const p of await dashboard.getParametersAsync()) {
    p.addEventListener(T.ParameterChanged, refresh);
  }
}
