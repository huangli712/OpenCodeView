#!/usr/bin/env bash
# OpenCodeView 启动脚本

set -e

cd "$(dirname "$0")"

echo "🚀 启动 OpenCodeView..."

if ! command -v bun &> /dev/null; then
    echo "❌ 错误: Bun 未安装"
    echo ""
    echo "请先安装 Bun："
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 错误: 未找到 package.json"
    echo "请确保在 OpenCodeView 根目录运行此脚本"
    exit 1
fi

echo "📦 安装依赖..."
bun install

echo ""
echo "🔧 验证 OpenCode 存储路径..."
if [ ! -d "~/.local/share/opencode/storage/message" ] && [ ! -d "~/.opencode/storage/message" ]; then
    echo "⚠️  警告: 未找到 OpenCode 存储目录"
    echo "   预期路径："
    echo "   - ~/.local/share/opencode/storage/message"
    echo "   - ~/.opencode/storage/message"
    echo ""
    echo "如果路径不同，请修改 backend/fileManager.ts 中的 OPENCODE_STORAGE_PATH"
fi

echo ""
echo "✅ 启动开发服务器..."
echo ""
echo "📁 应用地址: http://localhost:3000"
echo "📖 文档: 查看 README.md"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

bun run dev
