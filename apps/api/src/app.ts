import express from "express"
import cors from "cors"
import { createExpressMiddleware } from "@trpc/server/adapters/express"
import { appRouter } from "./routers/index.js"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.use("/trpc", createExpressMiddleware({ router: appRouter }))

export { app }
export type AppRouter = typeof appRouter
