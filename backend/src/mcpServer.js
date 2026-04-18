import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServiceContainer } from "./services/container.js";
import { listStudioTools, callStudioTool } from "./mcpTools.js";

async function main() {
  const container = createServiceContainer();
  const server = new Server(
    {
      name: "private-agent-studio-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: listStudioTools(),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return callStudioTool(request.params.name, request.params.arguments || {}, container);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
