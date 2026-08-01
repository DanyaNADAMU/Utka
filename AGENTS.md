<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


- **Project Separation Rule**: NadamuDash (Master, located at `/home/danya/Projects/NadamuDash`) and NadamuDash-node (Node, located at `/home/danya/Projects/NadamuDash-node`) are TWO SEPARATE PROJECTS and Git repositories. Never mix files, scripts, or code from NadamuDash-node into NadamuDash or vice versa.

- **Environment & SSH Rule**: The local machine ONLY contains the source code. The actual deployed application and its Docker containers run on remote servers.
  - Master server: accessible via `ssh moscow-nadamudash`.
  - Node server: accessible via `ssh ice-nadamudash-node`.
  - You may directly run SSH commands or use SSH subagents to inspect logs, check containers, or modify configurations on both servers.
  - To view Docker logs via SSH on Master or Node, use `sudo docker logs` or `sudo docker compose logs` (NOPASSWD is configured).
  - NEVER attempt to run `docker ps` or `docker compose` on the local machine.

- **Deployment Rules**:
  - Master Deployment: Use `./deploy.sh "commit message"` from the local Master repository directory (`/home/danya/Projects/NadamuDash`).
  - Node Deployment: Use `/home/danya/Projects/NadamuDash-node/deploy.sh "commit message"` from the local Node repository directory.
  - NEVER attempt to run server-side deployment scripts directly by hand over SSH unless explicitly requested. Always trigger deployments using the local deployment scripts.
