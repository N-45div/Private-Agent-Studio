export class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AppError";
    this.code = options.code || "request_failed";
    this.statusCode = options.statusCode || 400;
    this.details = options.details || null;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}
