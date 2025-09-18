export class Graph{
    constructor(){
        this.adjacencyList={};
    }
    addVertex(vertex){
        if(!this.adjacencyList[vertex]){
            this.adjacencyList[vertex]=[];
        }
    }
    addEdge(vertex1,vertex2,weight=1){
        this.addVertex(vertex1);
        this.addVertex(vertex2);
        this.adjacencyList[vertex1].push({node:vertex2,weight:weight});
    }
}