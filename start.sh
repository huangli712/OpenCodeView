#!/usr/bin/env bash
# OpenCodeView startup script

set -e

cd "$(dirname "$0")"

echo "🚀 Starting OpenCodeView..."

if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun not installed"
    echo ""
    echo "Please install Bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please ensure you run this script from the OpenCodeView root directory"
    exit 1
fi

echo "📦 Installing dependencies..."
bun install

echo ""
echo "🔧 Verifying OpenCode storage path..."
if [ ! -d "~/.local/share/opencode/storage/message" ] && [ ! -d "~/.opencode/storage/message" ]; then
    echo "⚠️ Warning: OpenCode storage directory not found"
    echo "   Expected paths:"
    echo "   - ~/.local/share/opencode/storage/message"
    echo "   - ~/.opencode/storage/message"
    echo ""
    echo "If the path is different, please modify OPENCODE_STORAGE_PATH in backend/fileutil.ts"
fi

echo ""
echo "✅ Starting development server..."
echo ""
echo "📁 Application URL: http://localhost:3000"
echo "📖 Documentation: See README.md"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

bun run dev
