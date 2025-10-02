import { drugTargetMap } from "./data/drugTargetMap.js";
import { drugDestinationMap } from "./data/drugDestinationMap.js";
import { proteinInteractions } from "./data/interactions.js";
import { Graph } from "./config/Graph.js";

const graph = new Graph();

// Initialize graph from proteinInteractions
Object.values(proteinInteractions).forEach(([protein1, protein2, weight]) => {
  try {
    graph.addEdge(protein1, protein2, weight);
  } catch (err) {
    console.warn(err.message);
  }
});

let cy;

// ---------------- Flash Messages ----------------
function flashMessage(msg, type = "success") {
  const flash = document.getElementById("flash");
  flash.textContent = msg;
  flash.style.background = type === "error" ? "#e0665eff" : "#27d1b5ff";
  flash.classList.remove("hidden");
  setTimeout(() => flash.classList.add("hidden"), 8000);
}

// ---------------- Initialize Cytoscape Network ----------------
function initializeNetwork() {
  const elements = [];

  // Build nodes and edges from graph.adjacencyList (dynamic + initial)
  Object.keys(graph.adjacencyList).forEach((node) => {
    if (!elements.find((el) => el.data && el.data.id === node)) {
      elements.push({ data: { id: node, label: node } });
    }
    graph.adjacencyList[node].forEach((edge, idx) => {
      const edgeId = `e-${node}-${edge.node}-${idx}`;
      if (!elements.find((el) => el.data && el.data.id === edgeId)) {
        elements.push({
          data: {
            id: edgeId,
            source: node,
            target: edge.node,
            weight: edge.weight,
            label: edge.weight.toString(),
          },
        });
      }
    });
  });

  if (!cy) {
    cy = cytoscape({
      container: document.getElementById("network"),
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#97c2fc",
            "border-width": 2,
            "border-color": "#2b7ce9",
            label: "data(label)",
            "font-size": 12,
            "text-valign": "center",
            color: "#333",
            "text-outline-width": 1,
            "text-outline-color": "#fff",
          },
        },
        {
          selector: "node:selected",
          style: { "background-color": "#ff7f7f", "border-color": "#ff0000" },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#848484",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#848484",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 10,
            color: "#555",
            "text-rotation": "autorotate",
          },
        },
        {
          selector: "edge:selected",
          style: { "line-color": "#ff0000", "target-arrow-color": "#ff0000" },
        },
      ],
      layout: { name: "cose", animate: true },
    });
  } else {
    cy.elements().remove();
    cy.add(elements);
    cy.layout({ name: "cose", animate: true }).run();
  }
}

// ---------------- Update Algorithm Info ----------------
function updateAlgorithmInfo() {
  const algorithm = document.getElementById("algorithmSelect").value;
  const infoDiv = document.getElementById("algorithmInfo");

  const descriptions = {
    bfs: {
      title: "BFS - Breadth First Search",
      desc: "Finds all proteins influenced by the drug target, exploring layer by layer to show the complete pathway spread.",
    },
    dijkstra: {
      title: "Dijkstra's Shortest Path",
      desc: "Finds the most efficient pathway from the drug target to other proteins based on interaction strengths.",
    },
    topological: {
      title: "Topological Sort",
      desc: "Shows the order of protein activation/inhibition in biological cascades, useful for understanding signal flow.",
    },
    validate: {
      title: "Validate Graph",
      desc: "Checks whether the current directed graph satisfies the Havel–Hakimi degree sequence constraints.",
    },
  };

  infoDiv.innerHTML = `<h5>${descriptions[algorithm].title}</h5><p>${descriptions[algorithm].desc}</p>`;
}

// ---------------- Reset Graph Visibility ----------------
const resetGraphVisibility = () => {
  cy.nodes().style("display", "none");
  cy.edges().style("display", "none");
};

// ---------------- Run Analysis ----------------
function runAnalysis() {
  const drugInput = document
    .getElementById("drugInput")
    .value.toLowerCase()
    .trim();
  const algorithm = document.getElementById("algorithmSelect").value;

  if (!drugInput) return flashMessage("Please enter a drug name", "error");

  const targetProtein = drugTargetMap[drugInput];
  if (!targetProtein)
    return flashMessage(`Drug ${drugInput} not found`, "error");

  const destinationProtein = drugDestinationMap[targetProtein];
  let result,
    pathwayText = "",
    stats = {};

  // Reset node/edge styles
  cy.nodes().forEach((n) =>
    n.style({ "background-color": "#97c2fc", "border-color": "#2b7ce9" })
  );
  cy.edges().forEach((e) =>
    e.style({ "line-color": "#848484", "target-arrow-color": "#848484" })
  );

  switch (algorithm) {
    case "bfs":
      result = graph.bfs(targetProtein, destinationProtein);
      pathwayText =
        `BFS Starting from ${targetProtein}: \n` + result.path.join("->");
      stats = {
        "Proteins Reached": result.path.length,
        "Max Depth": Math.max(...Object.values(result.levels)),
        "Starting Protein": targetProtein,
        "Destination Protein": destinationProtein,
      };
      resetGraphVisibility();
      result.path.forEach((protein, index) => {
        cy.$id(protein).style({
          display: "element",
          "background-color": index === 0 ? "#ff0000" : "#ffaaaa",
          "border-color": "#ff0000",
        });
      });
      for (let i = 0; i < result.path.length - 1; i++) {
        cy.edges(
          `[source="${result.path[i]}"][target="${result.path[i + 1]}"]`
        ).style({
          display: "element",
          "line-color": "#ff0000",
        });
      }
      break;

    case "dijkstra":
      const path = graph.dijkstra(targetProtein, destinationProtein);
      if (!path || path.length === 0) {
        pathwayText = `No path exists from ${targetProtein} to ${destinationProtein}`;
        stats = {
          "Starting Protein": targetProtein,
          "Destination Protein": destinationProtein,
          "Path Exists": false,
        };
        resetGraphVisibility();
      } else {
        pathwayText =
          `Dijkstra's Path from ${targetProtein} to ${destinationProtein}:\n` +
          path.join(" → ");
        stats = {
          "Path Length": path.length,
          "Starting Protein": targetProtein,
          "Destination Protein": destinationProtein,
          "Path Exists": true,
        };
        resetGraphVisibility();
        path.forEach((protein, index) =>
          cy.$id(protein).style({
            display: "element",
            "background-color": index === 0 ? "#ff0000" : "#ffaaaa",
            "border-color": "#ff0000",
          })
        );
        for (let i = 0; i < path.length - 1; i++) {
          cy.edges(`[source="${path[i]}"][target="${path[i + 1]}"]`).style({
            display: "element",
            "line-color": "#ff0000",
          });
        }
      }
      break;

    case "topological":
      result = graph.topologicalSort();
      const startIndex = result.indexOf(targetProtein);
      const endIndex = result.indexOf(destinationProtein);
      let relevantOrder =
        startIndex !== -1
          ? endIndex >= startIndex
            ? result.slice(startIndex, endIndex + 1)
            : result.slice(startIndex)
          : result;

      pathwayText =
        `Topological order from ${targetProtein} to ${destinationProtein}:\n` +
        relevantOrder.join(" → ");
      stats = {
        "Total Proteins": result.length,
        "Order Position (Target)": startIndex + 1,
        "Order Position (Destination)": endIndex + 1,
        "Proteins Between": relevantOrder.length - 1,
      };
      resetGraphVisibility();
      relevantOrder.forEach((protein, index) => {
        const intensity = 1 - index * 0.1;
        const color = `rgba(255, ${Math.floor(170 * intensity)}, ${Math.floor(
          170 * intensity
        )}, 1)`;
        cy.$id(protein).style({
          display: "element",
          "background-color": color,
          "border-color": "#ff0000",
        });
      });
      for (let i = 0; i < relevantOrder.length - 1; i++) {
        cy.edges(
          `[source="${relevantOrder[i]}"][target="${relevantOrder[i + 1]}"]`
        ).style({
          display: "element",
          "line-color": "#ff0000",
        });
      }
      break;
  }

  document.getElementById("resultsPanel").style.display = "block";
  document.getElementById("pathwayResults").textContent = pathwayText;
  document.getElementById("stats").innerHTML = Object.entries(stats)
    .map(
      ([key, value]) =>
        `<div class="stat-card"><div class="value">${value}</div><div class="label">${key}</div></div>`
    )
    .join("");
}
// ---------------- Validate Graph ----------------
function validateGraph() {
  try {
    if (graph.isValidDigraph()) {
      flashMessage(" Graph is valid according to Havel–Hakimi.");
      // Optional: highlight all nodes in normal style
      cy.nodes().style({
        "background-color": "#97c2fc",
        "border-color": "#2b7ce9",
      });
      cy.edges().style({
        "line-color": "#848484",
        "target-arrow-color": "#848484",
      });
      return true;
    } else {
      flashMessage(" Graph is invalid according to Havel–Hakimi.", "error");
      // Optional: highlight all nodes in red to indicate invalidity
      cy.nodes().style({
        "background-color": "#ff7f7f",
        "border-color": "#ff0000",
      });
      cy.edges().style({
        "line-color": "#ff0000",
        "target-arrow-color": "#ff0000",
      });
      return false;
    }
  } catch (err) {
    flashMessage(`Error validating graph: ${err.message}`, "error");
    return false;
  }
}
function analyzeBetweennessCentrality() {
  if (!cy) return flashMessage("Network not initialized", "error");

  // Compute betweenness centrality
  const BC = graph.betweennessCentralityDirected();

  // Display results panel
  document.getElementById("resultsPanel").style.display = "block";
  document.getElementById("pathwayResults").textContent =
    "Betweenness centrality of each protein:";
  document.getElementById("stats").innerHTML = Object.entries(BC)
    .map(
      ([node, value]) =>
        `<div class="stat-card"><div class="value">${value.toFixed(
          2
        )}</div><div class="label">${node}</div></div>`
    )
    .join("");

  const maxVal = Math.max(...Object.values(BC));
  cy.nodes().forEach((n) => {
    const val = BC[n.id()] || 0;
    const ratio = maxVal ? val / maxVal : 0; // scale 0 → 1
    const r = Math.floor(128 + (255 - 128) * ratio); // 128 → 255
    const g = Math.floor(0 + (140 - 0) * ratio); // 0 → 140
    const b = Math.floor(128 - 128 * ratio); // 128 → 0

    n.style({
      "background-color": `rgb(${r},${g},${b})`,
      "border-color": "#333",
    });
  });

  flashMessage(" Betweenness centrality computed successfully.");
}

// ---------------- Mode Toggle ----------------
const modeSelect = document.getElementById("modeSelect");
modeSelect.addEventListener("change", () => {
  const analysisPanel = document.getElementById("analysisPanel");
  const addNodePanel = document.getElementById("addNodePanel");
  if (modeSelect.value === "addNode") {
    analysisPanel.style.display = "none";
    addNodePanel.style.display = "block";
  } else {
    analysisPanel.style.display = "block";
    addNodePanel.style.display = "none";
  }
});

// ---------------- Add New Protein ----------------
document.getElementById("addProteinBtn").addEventListener("click", () => {
  const proteinName = document.getElementById("newProtein").value.trim();
  const neighborsInput = document.getElementById("neighborsInput").value.trim();

  if (!proteinName) return flashMessage("Enter a protein name", "error");

  graph.addVertex(proteinName);

  if (neighborsInput) {
    neighborsInput.split(",").forEach((item) => {
      const [neighbor, w] = item.split(":");
      const weight = Number(w) || 1;
      try {
        graph.addEdge(proteinName, neighbor.trim(), weight);
      } catch (err) {
        flashMessage(err.message, "error");
      }
    });
  }

  if (!graph.isValidDigraph()) {
    flashMessage(
      "Adding this protein breaks degree sequence constraints!",
      "error"
    );
    delete graph.adjacencyList[proteinName];
    initializeNetwork();
    return;
  }

  initializeNetwork();
  flashMessage(`Protein ${proteinName} added successfully!`);
});

// ---------------- Event Listeners ----------------
document
  .getElementById("algorithmSelect")
  .addEventListener("change", updateAlgorithmInfo);
document.getElementById("drugInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") runAnalysis();
});
document.getElementById("runBtn").addEventListener("click", runAnalysis);
document.getElementById("validateBtn").addEventListener("click", validateGraph);
document
  .getElementById("centralityBtn")
  .addEventListener("click", analyzeBetweennessCentrality);

// ---------------- On Load ----------------
window.onload = () => {
  flashMessage("Initializing network : Graph is initiated");
  initializeNetwork();
  updateAlgorithmInfo();
};
