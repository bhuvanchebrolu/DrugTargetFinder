import { drugTargetMap } from "./data/drugTargetMap.js";
import { drugDestinationMap } from "./data/drugDestinationMap.js";
import { proteinInteractions } from "./data/interactions.js";

import { Graph } from "./config/Graph.js";

const graph = new Graph();
Object.values(proteinInteractions).forEach(([protein1, protein2, weight]) => {
  graph.addEdge(protein1, protein2, weight);
});

function flashMessage(msg, type = "success") {
  const flash = document.getElementById("flash");
  flash.textContent = msg;
  flash.style.background = type === "error" ? "#e0665eff" : "#27d1b5ff";
  flash.classList.remove("hidden");

  setTimeout(() => flash.classList.add("hidden"), 4000);
}

let cy;
let initializeNetwork = () => {
  const elements = [];
  Object.values(proteinInteractions).forEach(
    ([protein1, protein2, weight], index) => {
      if (!elements.find((el) => el.data && el.data.id === protein1)) {
        elements.push({ data: { id: protein1, label: protein1 } });
      }
      if (!elements.find((el) => el.data && el.data.id === protein2)) {
        elements.push({ data: { id: protein2, label: protein2 } });
      }
      elements.push({
        data: {
          id: `e${index}`,
          source: protein1,
          target: protein2,
          weight: weight,
          label: weight.toString(),
        },
      });
    }
  );
  cy = cytoscape({
    container: document.getElementById("network"),
    elements: elements,
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
        style: {
          "background-color": "#ff7f7f",
          "border-color": "#ff0000",
        },
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
        style: {
          "line-color": "#ff0000",
          "target-arrow-color": "#ff0000",
        },
      },
    ],
    layout: {
      name: "cose", // force-directed layout
      animate: true,
    },
  });
};
let updateAlgorithmInfo = () => {
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
  };

  infoDiv.innerHTML = `
    <h5>${descriptions[algorithm].title}</h5>
    <p>${descriptions[algorithm].desc}</p>
  `;
};
const resetGraphVisibility = () => {
  cy.nodes().style("display", "none");
  cy.edges().style("display", "none");
};

let runAnalysis = () => {
  const drugInput = document
    .getElementById("drugInput")
    .value.toLowerCase()
    .trim();
  const algorithm = document.getElementById("algorithmSelect").value;

  if (!drugInput) {
    flashMessage("Please enter a drug name", "error");
    return;
  }

  const targetProtein = drugTargetMap[drugInput];
  if (!targetProtein) {
    flashMessage(
      `Drug Input ${drugInput} doent exist in the database. Try one more (Eg:- Aspirin)`,
      "error"
    );
    return;
  }
  const destinationProtein = drugDestinationMap[targetProtein];
  let result;
  let pathwayText = "";
  let stats = {};
  cy.nodes().forEach((n) =>
    n.style({
      "background-color": "#97c2fc",
      "border-color": "#2b7ce9",
    })
  );
  cy.edges().forEach((e) =>
    e.style({
      "line-color": "#848484",
      "target-arrow-color": "#848484",
    })
  );

  switch (algorithm) {
    case "bfs":
      result = graph.bfs(targetProtein, destinationProtein);
      pathwayText = `BFS Starting from ${targetProtein}: \n`;
      pathwayText += result.path.join("->");
      //assumin result return paths-->Aditya should take care
      stats = {
        "Proteins Reached": result.path.length,
        "Max Depth": Math.max(...Object.values(result.levels)),
        "Starting Protein": targetProtein,
        "Destination Protein": destinationProtein,
      };

      resetGraphVisibility(); //Hide all
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
        ).style({ display: "element", "line-color": "#ff0000" });
      }
      break;

    case "dijkstra":
      const path = graph.dijkstra(targetProtein, destinationProtein);
      if (!path || path.length == 0) {
        pathwayText = `No path exists from ${targetProtein} to ${destinationProtein} \n`;
        stats = {
          "Starting Protein": targetProtein,
          "Destination Protein": destinationProtein,
          "Path Exists": false,
        };
        resetGraphVisibility();
      } else {
        pathwayText = `Dijkstra's Path from ${targetProtein} to ${destinationProtein}:\n`;
        pathwayText += path.join(" → ");

        stats = {
          "Path Length": path.length,
          "Starting Protein": targetProtein,
          "Destination Protein": destinationProtein,
          "Path Exists": true,
        };
        resetGraphVisibility();
        path.forEach((protein, index) => {
          cy.$id(protein).style({
            display: "element",
            "background-color": index === 0 ? "#ff0000" : "#ffaaaa",
            "border-color": "#ff0000",
          });
        });

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

      let relevantOrder;
      if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
        relevantOrder = result.slice(startIndex, endIndex + 1);
      } else if (startIndex !== -1) {
        relevantOrder = result.slice(startIndex);
      } else {
        relevantOrder = result;
      }
      pathwayText = `Topological order from ${targetProtein} to ${destinationProtein}:\n`;
      pathwayText += relevantOrder.join(" → ");

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
        ).style({ display: "element", "line-color": "#ff0000" });
      }
      break;
  }
  document.getElementById("resultsPanel").style.display = "block";
  document.getElementById("pathwayResults").textContent = pathwayText;

  const statsHtml = Object.entries(stats)
    .map(
      ([key, value]) => `
          <div class="stat-card">
            <div class="value">${value}</div>
            <div class="label">${key}</div>
          </div>`
    )
    .join("");
  document.getElementById("stats").innerHTML = statsHtml;
};

document
  .getElementById("algorithmSelect")
  .addEventListener("change", updateAlgorithmInfo);
document.getElementById("drugInput").addEventListener("keypress", (e) => {
  if (e.key == "Enter") {
    runAnalysis();
  }
});
document.getElementById("runBtn").addEventListener("click",runAnalysis);
window.onload = () => {
  initializeNetwork();
  updateAlgorithmInfo();
};
