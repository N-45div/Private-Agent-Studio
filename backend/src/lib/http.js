export async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

export function applyCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Max-Age", "86400");
}

export function sendJson(response, statusCode, payload) {
  applyCors(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload, null, 2));
}

export function notFound(response) {
  sendJson(response, 404, {
    error: "not_found",
    message: "Route not found",
  });
}

export function methodNotAllowed(response, allowedMethods) {
  applyCors(response);
  response.writeHead(405, {
    Allow: allowedMethods.join(", "),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(
    JSON.stringify(
      {
        error: "method_not_allowed",
        allowedMethods,
      },
      null,
      2,
    ),
  );
}
