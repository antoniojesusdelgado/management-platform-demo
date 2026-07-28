# Third-party licenses

The original application code, documentation and visual identity are
proprietary and covered by the repository `LICENSE`. Dependencies remain under
their own licenses.

| Component | Purpose | License |
| --- | --- | --- |
| Next.js, React, TypeScript | Application runtime and language | MIT / Apache-2.0 |
| Tailwind CSS | Styling toolchain | MIT |
| Bun | Package manager and test runtime | MIT |
| Supabase clients and CLI | Auth, database and local development | MIT / Apache-2.0 |
| PostgreSQL and pgTAP | Database and database tests | PostgreSQL |
| Playwright and Axe | Browser and accessibility testing | Apache-2.0 / MPL-2.0 |
| Radix UI | Accessible primitives | MIT |
| Tabler Icons | Interface icons | MIT |
| Recharts | Charts | MIT |
| dnd-kit | Accessible drag and drop | MIT |
| Zod | Runtime schemas | MIT |
| date-fns, Sonner, clsx | UI support | MIT |

The exact transitive dependency versions are fixed by `bun.lock`. Before
redistribution, regenerate a machine-readable notice from that lockfile and
review all transitive licenses. AdventureWorks (MIT) and INE aggregate
statistics (CC BY 4.0) are references documented in `DATA-PROVENANCE.md`; no
source rows are shipped in the product dataset.
