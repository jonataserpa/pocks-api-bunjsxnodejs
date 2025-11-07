#!/bin/bash

echo "🚀 Configurando projeto POC Fastify vs Elysia..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker primeiro."
    exit 1
fi

# Subir PostgreSQL
echo "📦 Subindo PostgreSQL..."
docker-compose up -d

echo "⏳ Aguardando PostgreSQL estar pronto..."
sleep 5

# Configurar Fastify
echo "📦 Configurando Fastify (Node.js)..."
cd api-nodejs-fastify
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Arquivo .env criado para Fastify"
fi
npm install
cd ..

# Configurar Elysia
echo "📦 Configurando Elysia (Bun.js)..."
cd api-bunjs-elysia
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Arquivo .env criado para Elysia"
fi
bun install
cd ..

# Configurar testes de carga
echo "📦 Configurando testes de carga..."
cd load-test
npm install
cd ..

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Para iniciar as APIs:"
echo "  Fastify:  cd api-nodejs-fastify && npm run dev"
echo "  Elysia:   cd api-bunjs-elysia && bun run dev"
echo ""
echo "Para executar testes de carga:"
echo "  cd load-test && npm run test:both"

