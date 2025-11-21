#!/bin/bash

echo "📊 COMPARAÇÃO DE TAMANHOS DOS BUILDS"
echo ""

# Verificar se os builds existem
if [ ! -d "api-bunjs-elysia/dist" ] && [ ! -d "api-nodejs-fastify/dist" ]; then
    echo "❌ Nenhum build encontrado. Execute 'bun run build' ou 'npm run build' primeiro."
    exit 1
fi

echo "🔵 Bun.js (Elysia) - Standalone:"
if [ -f "api-bunjs-elysia/dist/api" ]; then
    BUN_SIZE=$(du -h api-bunjs-elysia/dist/api 2>/dev/null | cut -f1)
    echo "  Executável: $BUN_SIZE"
else
    echo "  ⚠️  Build não encontrado (execute: cd api-bunjs-elysia && bun run build:standalone)"
    BUN_SIZE="N/A"
fi

echo ""
echo "🟢 Node.js (Fastify) - Compilado:"
if [ -d "api-nodejs-fastify/dist" ]; then
    NODE_SIZE=$(du -sh api-nodejs-fastify/dist 2>/dev/null | cut -f1)
    echo "  Pasta dist: $NODE_SIZE"
    echo ""
    echo "  Detalhamento:"
    du -sh api-nodejs-fastify/dist/* 2>/dev/null | sed 's/^/    /'
else
    echo "  ⚠️  Build não encontrado (execute: cd api-nodejs-fastify && npm run build)"
    NODE_SIZE="N/A"
fi

echo ""
echo "📈 RESUMO:"
echo "  Bun standalone:  $BUN_SIZE"
echo "  Node compilado:  $NODE_SIZE"
echo ""
echo "💡 NOTA: O build do Bun inclui o runtime completo (executável standalone),"
echo "   enquanto o Node.js são apenas os arquivos JS que precisam do Node instalado."

