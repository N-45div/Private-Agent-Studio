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

export function sendJson(response, statusCode, payload) {
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
