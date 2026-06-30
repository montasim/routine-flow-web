import { readdirSync, readFileSync, statSync } from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return routeFiles(full)
    return entry === "route.ts" ? [full] : []
  })
}

function routeFileToOpenApiPath(file: string) {
  const relative = file
    .replace(process.cwd(), "")
    .replace(/^\/app\/api\/v1/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\[\.\.\.all\]/g, "{all}")
    .replace(/\[id\]/g, "{id}")
  return relative || "/"
}

describe("OpenAPI contract coverage", () => {
  test("documents every implemented /api/v1 route", () => {
    const spec = readFileSync(path.join(process.cwd(), "docs/api/openapi-v1.yaml"), "utf8")
    const implemented = routeFiles(path.join(process.cwd(), "app/api/v1")).map(routeFileToOpenApiPath).sort()

    for (const route of implemented) {
      expect(spec, `${route} is missing from docs/api/openapi-v1.yaml`).toContain(`  ${route}:`)
    }
  })
})

