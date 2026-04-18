import http from "node:http";
import { config } from "./config.js";
import { handleRequest } from "./app.js";

const server = http.createServer((request, response) => {
  handleRequest(request, response);
});

server.listen(config.port, config.host, () => {
  console.log(`AgentVault backend listening on http://${config.host}:${config.port}`);
});
