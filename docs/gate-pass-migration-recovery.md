# Recover container creation after a missing gate-pass column

`P2022` for `Shipment.companyGatePassRequested` means the Prisma client expects
columns that the connected database does not have. The schema defines both
`companyGatePassRequested` and `companyGatePassRequestedAt`, but the earlier
migration history never created them. Generating the client or redeploying alone
does not update the database.

## Production rollout

Use the database operator's trusted environment, with the production
`DATABASE_URL` and `DIRECT_URL` already configured for the same database used by
the application. Do not paste credentials into tickets or commit environment files.

1. Confirm a current database backup and review pending migrations:

   ```sh
   npm run db:migrate:status
   ```

2. Review **all** pending migrations before applying them. From the checkout
   containing `20261123153000_add_company_gate_pass_request`, run:

   ```sh
   npm run db:migrate:deploy
   ```

   The new migration only adds the two missing columns. Existing shipments get
   `companyGatePassRequested = false` and a null request timestamp. `IF NOT EXISTS`
   also supports databases where those columns were previously added manually.
   Do not use `db push`, `migrate reset`, or mark this migration applied without
   executing it. If migration history is inconsistent, stop and reconcile it
   rather than resetting production data.

3. Confirm migration status, then retry the failed container creation once and
   check its response and runtime logs. Check the container list first to avoid
   duplicate creation if an earlier request committed before its response failed.

4. Deploy the notification-stream fix. Its response now ends gracefully after
   240 seconds (below its explicit 300-second function limit); the existing
   browser EventSource reconnects automatically. Confirm a stream ends normally
   and reconnects instead of logging a runtime timeout.

The separate `P1001` database connection error is not fixed by adding columns;
if it recurs after this rollout, investigate database availability/connectivity.
