<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


- **Environment & SSH Rule**: The local machine ONLY contains the source code for NadamuDash. The actual deployed application and its Docker containers run on remote servers.
  - Master server: accessible via `ssh moscow-nadamudash`.
  - Node server: accessible via `ssh ice-nadamudash-node`.
  - You may directly run SSH commands or use SSH subagents to inspect logs, check containers, or modify configurations on both servers.
  - NEVER attempt to run `docker ps` or `docker compose` on the local machine.

- **Deployment Rules**:
  - Master Deployment: Use `./deploy.sh "commit message"` from the local repository directory (`/home/danya/Projects/NadamuDash`).
  - Node Deployment: Use `/home/danya/Projects/NadamuDash-node/deploy.sh "commit message"`.
  - NEVER attempt to run server-side deployment scripts directly by hand over SSH unless explicitly requested. Always trigger deployments using the local deployment scripts.
