# Docker Setup Guide

## Quick Start

Run the Docker setup script to build and start OpenClaw in a container:

```bash
./docker-setup.sh
```

This will:
1. Generate a random gateway token (or reuse `OPENCLAW_GATEWAY_TOKEN` if set)
2. Create configuration at `~/.openclaw/openclaw.json` with dev-friendly defaults
3. Build the Docker image
4. Run the onboarding wizard (quickstart mode, non-interactive)
5. Re-apply gateway settings (`bind`, `controlUi`, auth token) after onboarding
6. Start the gateway container on port 18789

On re-runs the script preserves your existing config while ensuring `gateway.bind`, `gateway.controlUi`, and `gateway.auth.token` are correct.

## Web UI Access

After the containers start, access the dashboard at:

```
http://127.0.0.1:18789/#token=<your-token>
```

The token is printed at the end of `docker-setup.sh`. The gateway binds to `0.0.0.0` (`lan` mode) so it is reachable from the host.

Device pairing is disabled by default (`dangerouslyDisableDeviceAuth`), so the dashboard and chat connect without a pairing step.

## Configuration

The configuration is stored in `~/.openclaw/openclaw.json`. The docker-setup creates this automatically with sensible defaults.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENCLAW_GATEWAY_PORT` | `18789` | Host port for the gateway |
| `OPENCLAW_BRIDGE_PORT` | `18790` | Host port for the bridge |
| `OPENCLAW_GATEWAY_BIND` | `lan` | Bind mode (`lan`, `loopback`, `auto`, `tailnet`, `custom`) |
| `OPENCLAW_GATEWAY_TOKEN` | _(random)_ | Gateway auth token (generated if unset) |
| `OPENCLAW_CONFIG_DIR` | `~/.openclaw` | Host path for config |
| `OPENCLAW_WORKSPACE_DIR` | `~/.openclaw/workspace` | Host path for workspace |
| `OPENCLAW_IMAGE` | `openclaw:local` | Docker image name |
| `OPENCLAW_DOCKER_APT_PACKAGES` | _(empty)_ | Extra apt packages to install in the image |
| `OPENCLAW_EXTRA_MOUNTS` | _(empty)_ | Comma-separated extra Docker bind mounts |
| `OPENCLAW_HOME_VOLUME` | _(empty)_ | Named Docker volume for `/home/node` |

### Port Binding Modes

The `gateway.bind` setting controls where the gateway listens:

- **`lan`** (0.0.0.0) - Accessible from your network (default for Docker)
- **`loopback`** (127.0.0.1) - Only accessible locally on the container
- **`auto`** - Automatically detect the best interface
- **`tailnet`** - Expose via Tailscale
- **`custom`** - Bind to a specific IP (set `customBindHost`)

### Authentication

By default, the docker-setup generates a random token. The config stores it in `gateway.auth.token`:

```json
{
  "gateway": {
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "your-generated-token-here"
    },
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true
    }
  }
}
```

`dangerouslyDisableDeviceAuth` disables device pairing for all connections. This is intended for local development; disable it in production.

### How the Config is Managed

The onboarding wizard (`openclaw onboard`) may overwrite settings like `bind` and `controlUi`. To prevent this, `docker-setup.sh` re-applies the required gateway settings after onboarding using a Python script. The patched fields are:

- `gateway.bind` (from `OPENCLAW_GATEWAY_BIND`, default `lan`)
- `gateway.controlUi.dangerouslyDisableDeviceAuth` (always `true`)
- `gateway.auth.mode` and `gateway.auth.token`

## Troubleshooting

**Gateway not accessible from host?**
- Verify `gateway.bind` is `lan` in `~/.openclaw/openclaw.json`
- Check docker port mapping: `docker compose ps`
- Ensure ports 18789 and 18790 are not blocked by firewall

**Token mismatch errors?**
- Check `~/.openclaw/openclaw.json` has the correct token
- Compare with `grep OPENCLAW_GATEWAY_TOKEN .env`
- Restart the gateway: `docker compose restart openclaw-gateway`

**"Pairing required" error in the Chat tab?**
- Ensure `gateway.controlUi.dangerouslyDisableDeviceAuth` is `true` in the config
- Restart the gateway after changing the config
- If the config keeps reverting, re-run `docker-setup.sh` (the post-onboarding patch will fix it)

**Config reverts after running docker-setup.sh?**
- The onboarding wizard rewrites the config; `docker-setup.sh` re-applies settings afterwards
- Check that `python3` is available on the host (required for the config patch)
- Verify the patch ran by looking for `==> Re-applying gateway settings...` in the output
