import { handleOptions, withCors } from "./cors.ts";

export async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function jsonOk(payload: unknown, status = 200) {
  return withCors(JSON.stringify(payload), { status });
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return withCors(JSON.stringify({ error: message, details }), { status });
}

export function preflight(request: Request) {
  return handleOptions(request);
}
