import type { ErrorRequestHandler, RequestHandler } from "express";

export function parseId(value: string | undefined, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    const err = new Error(`Invalid ${name}: ${value}`);
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  return n;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err?.name === "ZodError" && Array.isArray(err?.issues)) {
    res.status(400).json({ error: "Validation failed", issues: err.issues });
    return;
  }
  const status =
    (err as { status?: number })?.status ??
    (err as { statusCode?: number })?.statusCode ??
    500;
  const message = err?.message ?? "Internal server error";
  if (status >= 500) {
    req.log?.error({ err }, "Unhandled error");
  }
  res.status(status).json({ error: message });
};
