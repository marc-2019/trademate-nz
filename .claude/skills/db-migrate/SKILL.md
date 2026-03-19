---
name: db-migrate
description: "Create a new numbered database migration file following the project's 001-010 naming convention in database/migrations/"
disable-model-invocation: true
---

# Create Database Migration

Create a new numbered SQL migration file in `database/migrations/`.

## Steps

1. **Find the highest migration number**: List files in `database/migrations/` and find the highest numbered file (format: `NNN_description.sql`)
2. **Increment the number**: Add 1 to the highest number, zero-padded to 3 digits
3. **Create the file**: Name it `{NNN}_{user_description}.sql` using the description provided by the user (snake_case)
4. **Include boilerplate**:

```sql
-- Migration: {NNN}_{description}
-- Created: {current_date}
-- Description: {user's description of what this migration does}

BEGIN;

-- Your migration SQL here

COMMIT;
```

5. **Remind the user** to:
   - Test the migration locally: `docker exec trademate-postgres psql -U trademate -d trademate -f /path/to/migration.sql`
   - Update `scripts/migrate.sh` and `scripts/migrate-railway.sh` if needed
   - The migration files are applied in order by number

## Arguments

The user should provide a brief description of what the migration does, e.g.:
- `/db-migrate add customer products table`
- `/db-migrate add recurring schedule fields`

## Naming Convention

- Numbers: 3-digit zero-padded (001, 002, ..., 011, 012)
- Description: snake_case, descriptive but concise
- Extension: `.sql`
- Example: `011_customer_products.sql`
