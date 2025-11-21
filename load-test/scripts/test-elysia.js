const autocannon = require('autocannon');

const BASE_URL = process.env.ELYSIA_URL || 'http://localhost:3001';
const CONNECTIONS = parseInt(process.env.CONCURRENCY || '500', 10);
const DURATION = 60; // 60 seconds test

async function runTest() {
  console.log('🚀 Iniciando teste de carga otimizado com Autocannon...');
  console.log(`📍 URL: ${BASE_URL}`);
  console.log(`🔌 Conexões: ${CONNECTIONS}`);
  console.log(`⏱️  Duração: ${DURATION}s`);

  const instance = autocannon({
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION,
    pipelining: 1, // Disable pipelining to get reliable stats
    // workers: 4, // Workers removed because setupRequest cannot be cloned
    requests: [
      {
        method: 'POST',
        path: '/users',
        setupRequest: (req) => {
          // Use a simple counter for uniqueness and speed
          const id = (Math.random() * 10000000) | 0;
          const unique = process.hrtime.bigint().toString();
          const body = JSON.stringify({
            name: `User ${id}`,
            email: `u${id}-${unique}@test.com`,
            age: (id % 90) + 10,
          });
          req.headers['content-type'] = 'application/json';
          req.body = body;
          return req;
        }
      }
    ]
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log('\n📊 Resultados do Teste:');
    console.log(`   Total de Requisições: ${result.requests.total.toLocaleString()}`);
    console.log(`   Duração Real: ${result.duration}s`);
    console.log(`   Taxa Média: ${result.requests.average.toFixed(2)} req/s`);
    console.log(`   Latência Média: ${result.latency.average.toFixed(2)}ms`);
    console.log(`   P99 Latência: ${result.latency.p99}ms`);
    console.log(`   Sucessos: ${result['2xx']}`);
    console.log(`   Erros: ${result.non2xx}`);

    if (result.requests.average < 7000) {
      console.log('\n⚠️  Aviso: A meta de 7000 req/s não foi atingida.');
    } else {
      console.log('\n✅ Meta de 7000 req/s atingida!');
    }
  });
}

runTest();

