import { describe, it, expect } from "vitest"
import request from "supertest"
import { app } from "./app.js"

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe("tRPC healthCheck", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/trpc/healthCheck")
    expect(res.status).toBe(200)
    expect(res.body.result.data).toEqual({ ok: true })
  })
})
