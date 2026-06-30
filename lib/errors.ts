export class ApiProblem extends Error {
  constructor(
    public status: number,
    public code: string,
    public title: string,
    detail?: string
  ) {
    super(detail || title)
  }
}

export function unauthorized(detail = "Authentication is required.") {
  return new ApiProblem(401, "UNAUTHORIZED", "Unauthorized", detail)
}

export function forbidden(detail = "You cannot access this resource.") {
  return new ApiProblem(403, "FORBIDDEN", "Forbidden", detail)
}

export function notFound(resource = "Resource") {
  return new ApiProblem(404, "NOT_FOUND", "Not Found", `${resource} was not found.`)
}

export function conflict(code: string, detail: string) {
  return new ApiProblem(409, code, "Conflict", detail)
}

export function badRequest(code: string, detail: string) {
  return new ApiProblem(400, code, "Bad Request", detail)
}

