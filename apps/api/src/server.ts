import express from "express"
import cors from "cors"

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})