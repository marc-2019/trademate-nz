// index.ts
import express from "express";
import config from "./config.js";
import { runMigrations } from "./services/migrate.js";

const app = express();

// Middleware and routes setup...

// Run migrations unless SKIP_MIGRATIONS is set
if (process.env.SKIP_MIGRATIONS !== "true") {
  await runMigrations();
}

app.listen(config.PORT, () => {
  console.log(`API running on port ${config.PORT}`);
});