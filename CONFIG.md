# OpenCodeView Configuration

## Environment Variables

You can configure OpenCodeView using environment variables:

- `PORT` - Server port (default: 3000)
- `OPCODE_STORAGE_PATH` - Custom OpenCode storage path (optional)

Example:
\`\`\`bash
PORT=8080 bun run start
OPCODE_STORAGE_PATH=/custom/path/to/opencode bun run start
\`\`\`

## Model Pricing

Pricing data is loaded from `config/models.json`.

You can add or update model pricing by editing this file.

Format:
\`\`\`json
{
  "model-id": {
    "input": 3.00,
    "output": 15.00,
    "cacheWrite": 0.50,
    "cacheRead": 0.05
  }
}
\`\`\`

## Storage Paths

OpenCodeView automatically searches for OpenCode storage in these locations (in order):

1. `~/.local/share/opencode/storage/message`
2. `~/.opencode/storage/message`
3. `~/.config/opencode/storage/message`

If your OpenCode uses a different location, set the `OPCODE_STORAGE_PATH` environment variable.
