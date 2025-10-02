export class Graph {
  constructor() {
    this.adjacencyList = {};
  }

  addVertex(vertex) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
    }
  }

  addEdge(vertex1, vertex2, weight = 1) {
    this.addVertex(vertex1);
    this.addVertex(vertex2);

    // Prevent self-loops
    if (vertex1 === vertex2) {
      throw new Error("Invalid edge: self-loops not allowed.");
    }

    // Prevent duplicate edges
    if (this.adjacencyList[vertex1].some((e) => e.node === vertex2)) {
      throw new Error("Invalid edge: duplicate edge not allowed.");
    }

    this.adjacencyList[vertex1].push({ node: vertex2, weight });
  }

  // ---------------- BFS ----------------
  bfs(start, destination = null) {
    const queue = [start];
    const visited = new Set([start]);
    const levels = { [start]: 0 };
    const parent = { [start]: null };

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === destination) break;

      for (let neighbor of this.adjacencyList[current]) {
        if (!visited.has(neighbor.node)) {
          visited.add(neighbor.node);
          parent[neighbor.node] = current;
          levels[neighbor.node] = levels[current] + 1;
          queue.push(neighbor.node);
        }
      }
    }

    let path = [];
    if (destination) {
      let curr = destination;
      while (curr !== null) {
        path.unshift(curr);
        curr = parent[curr] ?? null;
      }
      if (path[0] !== start) path = [];
    } else {
      path = Array.from(visited);
    }

    return { path, levels };
  }

  // ---------------- Dijkstra ----------------
  dijkstra(start, destination) {
    const distances = {};
    const prev = {};
    const pq = new Map();

    for (let vertex in this.adjacencyList) {
      distances[vertex] = Infinity;
      prev[vertex] = null;
      pq.set(vertex, Infinity);
    }
    distances[start] = 0;
    pq.set(start, 0);

    while (pq.size > 0) {
      let current = [...pq.entries()].reduce((a, b) =>
        a[1] < b[1] ? a : b
      )[0];
      let dist = pq.get(current);
      pq.delete(current);

      if (current === destination) break;

      for (let neighbor of this.adjacencyList[current]) {
        let alt = dist + neighbor.weight;
        if (alt < distances[neighbor.node]) {
          distances[neighbor.node] = alt;
          prev[neighbor.node] = current;
          pq.set(neighbor.node, alt);
        }
      }
    }

    const path = [];
    let curr = destination;
    while (curr !== null) {
      path.unshift(curr);
      curr = prev[curr];
    }
    if (path[0] !== start) return [];
    return path;
  }

  // ---------------- Topological Sort ----------------
  topologicalSort() {
    const visited = new Set();
    const stack = [];

    const dfs = (node) => {
      visited.add(node);
      for (let neighbor of this.adjacencyList[node]) {
        if (!visited.has(neighbor.node)) {
          dfs(neighbor.node);
        }
      }
      stack.push(node);
    };

    for (let vertex in this.adjacencyList) {
      if (!visited.has(vertex)) {
        dfs(vertex);
      }
    }

    return stack.reverse();
  }

  // ---------------- Degree Sequences ----------------
  getOutDegrees() {
    return Object.keys(this.adjacencyList).map(
      (v) => this.adjacencyList[v].length
    );
  }

  getInDegrees() {
    const indeg = {};
    Object.keys(this.adjacencyList).forEach((v) => (indeg[v] = 0));
    for (let u in this.adjacencyList) {
      this.adjacencyList[u].forEach((edge) => {
        indeg[edge.node]++;
      });
    }
    return Object.values(indeg);
  }
  allPaths(start, end) {
    const results = [];
    const visited = new Set();

    const dfs = (node, path) => {
        visited.add(node);
        path.push(node);

        if (node === end) {
            results.push([...path]);
        } else {
            for (let neighbor of this.adjacencyList[node] || []) {
                if (!visited.has(neighbor.node)) {
                    dfs(neighbor.node, path);
                }
            }
        }

        path.pop();
        visited.delete(node);
    };

    dfs(start, []);
    return results;
}
  // ---------------- Directed Havel–Hakimi Validation ----------------
  isValidDigraph() {
    const outDeg = this.getOutDegrees();
    const inDeg = this.getInDegrees();
    const n = outDeg.length;

    // 1. Total balance
    if (outDeg.reduce((a, b) => a + b, 0) !== inDeg.reduce((a, b) => a + b, 0))
      return false;

    // 2. Bounds
    if (
      outDeg.some((d) => d < 0 || d >= n) ||
      inDeg.some((d) => d < 0 || d >= n)
    )
      return false;

    // 3. Majorization
    let outSorted = [...outDeg].sort((a, b) => b - a);
    for (let k = 1; k <= n; k++) {
      const lhs = outSorted.slice(0, k).reduce((a, b) => a + b, 0);
      const rhs = inDeg.reduce((a, b) => a + Math.min(k, b), 0);
      if (lhs > rhs) return false;
    }

    return true;
  }
  betweennessCentralityDirected() {
    const nodes = Object.keys(this.adjacencyList);
    const BC = {};
    nodes.forEach((n) => (BC[n] = 0));

    nodes.forEach((s) => {
      const stack = [];
      const pred = {};
      const sigma = {};
      const dist = {};
      const queue = [];

      nodes.forEach((v) => {
        pred[v] = [];
        sigma[v] = 0;
        dist[v] = -1;
      });
      sigma[s] = 1;
      dist[s] = 0;
      queue.push(s);

      while (queue.length > 0) {
        const v = queue.shift();
        stack.push(v);

        this.adjacencyList[v].forEach(({ node: w }) => {
          // FOLLOW EDGE DIRECTION
          if (dist[w] < 0) {
            dist[w] = dist[v] + 1;
            queue.push(w);
          }
          if (dist[w] === dist[v] + 1) {
            sigma[w] += sigma[v];
            pred[w].push(v);
          }
        });
      }

      const delta = {};
      nodes.forEach((v) => (delta[v] = 0));

      while (stack.length > 0) {
        const w = stack.pop();
        pred[w].forEach((v) => {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        });
        if (w !== s) BC[w] += delta[w];
      }
    });

    return BC;
  }
}
