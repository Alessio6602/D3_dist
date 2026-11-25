import * as d3 from "npm:d3";

// rows: [{esame, studente, tempo}]
export function createViolinPlot(rows, {width = 900, height = 520, bandwidth = 120, tempoMin = -1000} = {}) {
  // 1. PREPARAZIONE DATI
  // Una riga per studente ed esame, sopra il tempo minimo (taglia gli outlier)
  const visti = new Set();
  const dati = rows.filter(d => {
    if (!Number.isFinite(d.tempo) || d.tempo < tempoMin) return false;
    const key = `${d.studente}|${d.esame}`;
    if (visti.has(key)) return false;
    visti.add(key);
    return true;
  });

  // Stima di densità con kernel di Epanechnikov
  function kde(values, bw, n = 100) {
    const [lo, hi] = d3.extent(values);
    if (lo === hi) return [[lo, 1], [hi, 1]];
    const grid = d3.range(n + 1).map(i => lo + (i * (hi - lo)) / n);
    return grid.map(x => [x, d3.mean(values, v => {
      const u = (x - v) / bw;
      return Math.abs(u) <= 1 ? (0.75 * (1 - u * u)) / bw : 0;
    })]);
  }
  
  // Raggruppa per esame, calcola la densità e i quantili Q1, mediana, Q3
  const groups = d3
    .rollups(dati, v => v.map(d => d.tempo).sort(d3.ascending), d => d.esame)
    .map(([esame, values]) => ({
      esame,
      values,
      density: kde(values, bandwidth),
      q: [0.25, 0.5, 0.75].map(p => d3.quantile(values, p))
    }))
    .sort((a, b) => d3.ascending(a.esame, b.esame));
  
    // crea l'elemento SVG
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto; display: block; font-family: sans-serif;");

    // Se non ci sono dati, scrive un messaggio e ritorna l'SVG vuoto
  if (groups.length === 0) {
    svg.append("text")
      .attr("x", width / 2).attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .text("Nessun dato con i filtri attuali");
    return svg.node();
  }

  const margin = {top: 20, right: 20, bottom: 150, left: 60};
  const color = "#4e73df";

  // scale per gli assi e la larghezza dei violini, x per gli esami, y per i tempi, w per la densità
  const x = d3.scaleBand(groups.map(g => g.esame), [margin.left, width - margin.right]).padding(0.1);
  const y = d3.scaleLinear(d3.extent(dati, d => d.tempo), [height - margin.bottom, margin.top]).nice();
  const maxDen = d3.max(groups, g => d3.max(g.density, d => d[1]));
  const w = d3.scaleLinear([0, maxDen], [0, x.bandwidth() / 2]);

  // 2. ASSI
  // asse verticale a sinistra (tempi)
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));
  svg.append("text")
    .attr("x", margin.left).attr("y", 10)
    .attr("font-size", 11)
    .attr("fill", "currentColor")
    .attr("opacity", 0.7)
    .text("giorni");

  // asse orizzontale sullo 0
  if (y.domain()[0] < 0 && y.domain()[1] > 0) {
    svg.append("line")
      .attr("x1", margin.left).attr("x2", width - margin.right)
      .attr("y1", y(0)).attr("y2", y(0))
      .attr("stroke", "currentColor").attr("opacity", 0.4)
      .attr("stroke-dasharray", "4 3");
  }
  // asse orizzontale in basso (esami)
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d => (d.length > 22 ? d.slice(0, 21) + "…" : d)))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // 3. VIOLINI
  const area = d3.area()
    .curve(d3.curveCatmullRom)
    .y(d => y(d[0]))
    .x0(d => -w(d[1])) // per simmetria del violino
    .x1(d => w(d[1]));

  const violin = svg.append("g")
    .selectAll("g")
    .data(groups)
    .join("g")
    .attr("transform", g => `translate(${x(g.esame) + x.bandwidth() / 2},0)`)
    .style("cursor", "default");

  violin.append("path")
    .attr("d", g => area(g.density))
    .attr("fill", color)
    .attr("fill-opacity", 0.6)
    .attr("stroke", color);

  // box piccolo al centro (Q1-Q3) e mediana
  violin.append("rect")
    .attr("x", -4)
    .attr("width", 8)
    .attr("y", g => y(g.q[2]))
    .attr("height", g => Math.max(1, y(g.q[0]) - y(g.q[2])))
    .attr("fill", "#333");
  violin.append("circle")
    .attr("cy", g => y(g.q[1]))
    .attr("r", 3)
    .attr("fill", "#fff");

  // tooltip con i valori del violino
  violin.append("title").text(
    g => `${g.esame}\nStudenti: ${g.values.length}\nMediana: ${g.q[1].toFixed(0)}\nQ1 – Q3: ${g.q[0].toFixed(0)} – ${g.q[2].toFixed(0)}`
  );

  // Al passaggio del cursore: evidenzia il violino, attenua gli altri
  violin
    .on("mouseenter", function () {
      const hovered = this;
      violin.transition("hover").duration(150)
        .style("opacity", function () { return this === hovered ? 1 : 0.3; });
      d3.select(this).select("path").attr("fill-opacity", 0.9);
    })
    .on("mouseleave", function () {
      violin.transition("hover").duration(150).style("opacity", 1);
      d3.select(this).select("path").attr("fill-opacity", 0.6);
    });

  return svg.node();
}
