<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


- **Environment Rule**: The local machine ONLY contains the source code for NadamuDash. The actual deployed application and its Docker containers run on a remote server accessible via SSH (`ssh moscow-nadamudash`). NEVER attempt to run `docker ps`, `docker compose`, or interact with the running panel on the local machine. All production environment checks must be done via a dedicated SSH subagent.
