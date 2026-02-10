# Docker Setup Guide

## Quick Start

Run the Docker setup script to start OpenClaw in a container:

```bash
./docker-setup.sh
```

This will:
1. Build the Docker image (if needed)
2. Generate a random gateway token
3. Create configuration directory at `~/.openclaw`
4. Start the gateway and CLI containers
5. Expose the gateway on port 18789

## Web UI Access

After the containers start, you can access the web UI at:

```
http://127.0.0.1:18789
```

The gateway will automatically be bound to your local network (`lan` mode) and accessible from your main computer.

## Configuration

The configuration is stored in `~/.openclaw/openclaw.json`. The docker-setup creates this automatically with sensible defaults.

### Port Binding Modes

The `gateway.bind` setting controls where the gateway listens:

- **`loopback`** (127.0.0.1) - Only accessible locally on the container
- **`lan`** (0.0.0.0) - Accessible from your network (default for Docker)
- **`auto`** - Automatically detect the best interface
- **`tailnet`** - Expose via Tailscale

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

For development, `dangerouslyDisableDeviceAuth` disables device pairing checks.

## Troubleshooting

**Gateway not accessible from main computer?**
- Verify `gateway.bind` is set to `lan` or `auto`
- Check docker port mapping: `docker port <container-id>`
- Ensure ports 18789 and 18790 are not blocked

**Token mismatch errors?**
- Check that `~/.openclaw/openclaw.json` has the correct token
- Restart the container: `docker restart <container-id>`

**"Pairing required" error?**
- Set `controlUi.dangerouslyDisableDeviceAuth: true` for local dev
- This is automatically configured by docker-setup
