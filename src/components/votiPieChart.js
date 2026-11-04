import * as d3 from "npm:d3";

export function createVotiPieChart(data, {width = 500, height = 400, legendWidth = 220} = {}) {
  // --- Adatta questi nomi alle colonne reali del tuo dataset ---
  const GRADE = "End_Course_grade";
  const LAUDE = "End_Course_Laude";

  const isLaureato = d =>
    d[GRADE] != null && d[GRADE] !== "" && !Number.isNaN(+d[GRADE]);
  const isLode = d => d[LAUDE] === true || d[LAUDE] === "true" || d[LAUDE] === 1 || d[LAUDE] === "1";

  // 1. DATI A DUE LIVELLI
  const dataMain = d3.rollups(
    data,
    v => v.length,
    d => isLaureato(d) ? "Laureato" : "In Corso / Non Laureato"
  );

  const laureati = data.filter(isLaureato);
  const dataLode = d3.rollups(
    laureati,
    v => v.length,
    d => isLode(d) ? "Laureato con lode" : "Laureato senza lode"
  );

  const margin = 20;
  const radius = Math.min(width, height) / 2 - margin;
  const innerRadius = radius * 0.45;

  const svg = d3.create("svg")
    .attr("width", width + legendWidth)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width + legendWidth, height])
    .attr("style", "max-width: 100%; height: auto; display: block; font-family: sans-serif;");

  const color = d3.scaleOrdinal()
    .domain(["In Corso / Non Laureato", "Laureato", "Laureato senza lode", "Laureato con lode"])
    .range(["#4e73df", "#f6c23e", "#fd7e14", "#1cc88a"]);

  const pie = d3.pie().value(d => d[1]).sort(null);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
  const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 8);
  const arcLabel = d3.arc().innerRadius((radius + innerRadius) / 2).outerRadius((radius + innerRadius) / 2);

  const chartGroup = svg.append("g");
  const labelGroup = svg.append("g")
    .attr("font-size", 12).attr("font-weight", "bold")
    .attr("text-anchor", "middle").attr("pointer-events", "none");
  const legendGroup = svg.append("g")
    .attr("transform", `translate(${radius + 30}, ${-height / 4})`);

  // Pulsante centrale "Indietro"
  const centerText = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "currentColor")
    .style("cursor", "pointer")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .text("");

  // 2. RENDERING
  function render(dataset, isSubChart) {
    const arcs = pie(dataset);
    const key = d => d.data[0];

    // --- Fette ---
    const paths = chartGroup.selectAll("path:not(.exiting)")
      .data(arcs, key)
      .join(
        enter => enter.append("path")
          .attr("fill", d => color(d.data[0]))
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .style("opacity", 0)
          .each(function(d) { this._current = {...d, endAngle: d.startAngle}; }), // cresce dall'angolo iniziale
        update => update,
        exit => exit.classed("exiting", true)
          .style("pointer-events", "none")
          .transition().duration(300).style("opacity", 0).remove()
      );

    paths
      .style("cursor", d => d.data[0] === "Laureato" ? "pointer" : "default")
      .on("mouseenter", function() {
        d3.select(this).transition("hover").duration(150).attr("d", arcHover);
      })
      .on("mouseleave", function() {
        d3.select(this).transition("hover").duration(150).attr("d", arc);
      })
      .on("click", (event, d) => {
        if (d.data[0] === "Laureato") render(dataLode, true);
      })
      .transition().duration(500)
      .style("opacity", 1)
      .attrTween("d", function(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return t => arc(i(t));
      });

    // --- Etichette numeriche ---
    labelGroup.selectAll("text:not(.exiting)")
      .data(arcs, key)
      .join(
        enter => enter.append("text")
          .attr("fill", "#fff")
          .style("opacity", 0)
          .attr("transform", d => `translate(${arcLabel.centroid(d)})`),
        update => update,
        exit => exit.classed("exiting", true)
          .transition().duration(300).style("opacity", 0).remove()
      )
      .text(d => d.data[1] > 0 ? d.data[1] : "")
      .transition().duration(500)
      .style("opacity", 1)
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`);

    // --- Legenda dinamica ---
    legendGroup.selectAll("g:not(.exiting)")
      .data(dataset.map(d => d[0]), d => d)
      .join(
        enter => {
          const g = enter.append("g")
            .attr("transform", (d, i) => `translate(0, ${i * 25})`)
            .style("opacity", 0);
          g.append("rect").attr("width", 15).attr("height", 15).attr("rx", 3).attr("fill", d => color(d));
          g.append("text").attr("x", 25).attr("y", 12).attr("font-size", 12)
            .attr("fill", "currentColor").text(d => d);
          return g;
        },
        update => update,
        exit => exit.classed("exiting", true)
          .transition().duration(300).style("opacity", 0).remove()
      )
      .transition().duration(500)
      .style("opacity", 1)
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    // --- Pulsante indietro ---
    centerText.interrupt();
    if (isSubChart) {
      centerText
        .text("⬅ Indietro")
        .style("pointer-events", "all")
        .on("click", () => render(dataMain, false))
        .transition().duration(400).style("opacity", 1);
    } else {
      centerText
        .on("click", null)
        .style("pointer-events", "none")
        .transition().duration(300).style("opacity", 0)
        .on("end", function() { d3.select(this).text(""); });
    }
  }

  render(dataMain, false);
  return svg.node();
}