/** The error body the backend returns (RFC 9457 ProblemDetail with a machine-readable code). */
export interface Problem {
  status?: number;
  code?: string;
  errors?: { field: string; code: string }[];
}

/** Thrown by queries for a failed API call; carries the backend's problem body. */
export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem, status: number) {
    super(`API request failed (${status}${problem.code ? `, ${problem.code}` : ""})`);
    this.name = "ApiError";
    this.problem = problem;
  }
}

function isProblem(value: unknown): value is Problem {
  return typeof value === "object" && value !== null;
}

/** The problem body of an openapi-fetch error or of an ApiError thrown by a query. */
export function asProblem(error: unknown): Problem {
  if (error instanceof ApiError) {
    return error.problem;
  }
  return isProblem(error) ? error : {};
}
