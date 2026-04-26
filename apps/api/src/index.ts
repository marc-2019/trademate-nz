// ... [previous content up to server setup]

// Run migrations unless SKIP_MIGRATIONS is set
import { runMigrations } from "./services/migrate.js";

if (process.env.SKIP_MIGRATIONS !== "true") {
  await runMigrations();
}

app.listen(config.PORT, () => {
  console.log(`BossBoard API listening on port ${config.PORT}`);
});
