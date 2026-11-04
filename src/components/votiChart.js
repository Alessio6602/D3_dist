import * as d3 from "npm:d3";

// Funzione sincrona: prende i dati già pronti e crea l'SVG
export function createVotiChart(data, {width = 600, height = 400} = {}) {
  // Isoli ad esempio solo chi si è laureato
  const laureati = data.filter(d => d.Student_Status_Reason === "Conseguimento Titolo");

  // Mostra i nomi esatti di tutte le colonne della prima riga
  console.log("Nomi delle colonne:", Object.keys(laureati[0]));
  console.log("Righe filtrate da disegnare:", laureati.length);
  console.log("Esempio valore:", new Set(laureati.map(d => d.Student_Status_Reason)));

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

  // ... logica D3 pura usando l'array laureati ...

  return svg.node();
}