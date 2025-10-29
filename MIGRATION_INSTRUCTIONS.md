# Database Migration for Mindmap Feature

## Run the migration

You need to run the Prisma migration to add the Mindmap table to your database:

```bash
# Generate the migration
npx prisma migrate dev --name add_mindmap_table

# Or if in production
npx prisma migrate deploy
```

## Then generate the Prisma client

```bash
npx prisma generate
```

## Restart your development server

After running the migration, restart your development server to use the updated Prisma client.

```bash
# Stop the current server (Ctrl+C) and restart
bun run dev
```

## What was added

- **Mindmap model**: Stores mindmap data (title, status, JSON data)
- **Relationship**: One-to-one relationship between Transcription and Mindmap
- **Status field**: Tracks mindmap generation status (processing, completed, failed)
- **JSON field**: Stores the complete mindmap structure (nodes and edges)
