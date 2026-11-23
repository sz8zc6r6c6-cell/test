# Live hypothesis map inside Fibery

This is the App.tsx of a Fibery custom app. It uses Fibery's shipped authenticated `@/lib/fibery` helper and React Query; it is not a standalone application.

Enable the official Notion connector for the single intended database and select an automatic schedule (the tested UI offers hourly as the fastest interval). Set user synchronization to Skip. Use the synced database `RD TEST Гипотезы/Гипотезы Notion`.

The app reads this database every 15 seconds while open. It adds and removes nodes from query results automatically, and draws edges from the full text of the `Предшественники ID` field. IDs come from the `ID` field. Status changes update the existing node; each node is keyed by its Fibery UUID. Duplicate visible IDs, missing predecessors and cycles are reported. Archived records are hidden; closed hypotheses remain visible.

No tokens, private page URLs or exported workspace records are required in source control. User permissions apply to all runtime reads.

## Verification

Local TypeScript checking and production build pass. The server build passed. Integration observations are recorded in the private canonical hypothesis; hourly unattended execution is configured separately from one-off Sync requests used for acceptance testing.
