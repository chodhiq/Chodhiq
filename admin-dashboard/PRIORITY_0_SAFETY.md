# Priority 0 safety record

Recorded: 2026-08-14 01:04 IST

## Checkpoint

- Branch: `backup/pre-priority0-20260814-010412`
- Commit: `ea0d7b26e8e0a2c3541601efe99a0125434e183d`

## Environment

- Active local environment file: `.env.local`
- Exact-value snapshot: `.env.priority0-20260814-010412` (intentionally ignored by Git)
- Variables used by the app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase project ref derived from the URL and local CLI link: `ljhncdzhzoatonhhofbv`
- Supabase metadata name: `Dominicousv's Project`

The metadata does not identify this project as staging. Treat all remote database operations and schema changes as blocked until the project owner confirms that ref `ljhncdzhzoatonhhofbv` is staging/non-production.

## Hosting

- Current `.openai/hosting.json` project: `appgprj_6a75cfa44ad48191aa7524e8c061f001`
- Repository origin and original hosting project: `appgprj_6a743bbc8bc08191b41d921f8f0ea5f1`

The current hosting project differs from the repository origin/original value. Do not publish until the owner confirms that `appgprj_6a75cfa44ad48191aa7524e8c061f001` is the intended showcase project.

## Rollback

1. Preserve any later work with a new commit or branch.
2. Switch to `backup/pre-priority0-20260814-010412`.
3. Restore the checkpoint with commit `ea0d7b26e8e0a2c3541601efe99a0125434e183d`.
4. Restore environment values from `.env.priority0-20260814-010412` if the local environment changed.
5. Do not run Supabase migrations or deploy until both target confirmations above are resolved.
