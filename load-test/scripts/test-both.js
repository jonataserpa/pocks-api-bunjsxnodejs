const autocannon = require('autocannon');
const http = require('http');
const { Readable, Transform, Writable } = require('stream');

const FASTIFY_URL = process.env.FASTIFY_URL || 'http://localhost:3000';
const ELYSIA_URL = process.env.ELYSIA_URL || 'http://localhost:3001';

// Readable Stream: Gera requisições sob demanda
class RequestGenerator extends Readable {
  constructor(startTime, processId, totalRequests) {
    super({ objectMode: true });
    this.counter = 0;
    this.startTime = startTime;
    this.processId = processId;
    this.totalRequests = totalRequests;
  }

  _read() {
    if (this.counter >= this.totalRequests) {
      this.push(null);
      return;
    }

    this.counter++;
    const uniqueId = `${this.startTime}-${this.processId}-${this.counter}-${Math.random().toString(36).substring(2, 15)}`;
    const requestData = {
      index: this.counter,
      name: `Test User ${uniqueId}`,
      email: `test${uniqueId}@example.com`,
      age: Math.floor(Math.random() * 100) + 1,
    };

    this.push(requestData);
  }
}

// Transform Stream: Processa cada requisição sequencialmente
class RequestProcessor extends Transform {
  constructor(baseUrl) {
    super({ objectMode: true });
    this.baseUrl = baseUrl;
    this.successCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  async _transform(requestData, encoding, callback) {
    try {
      const result = await this.makeRequest(requestData);
      
      if (result.success) {
        this.successCount++;
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const rate = (requestData.index / elapsed).toFixed(2);
        const progress = ((requestData.index / this.totalRequests) * 100).toFixed(2);
        
        callback(null, {
          index: requestData.index,
          success: true,
          email: requestData.email,
          statusCode: result.statusCode,
          elapsed,
          rate,
          progress,
          successCount: this.successCount,
          errorCount: this.errorCount,
        });
      } else {
        this.errorCount++;
        callback(null, {
          index: requestData.index,
          success: false,
          email: requestData.email,
          statusCode: result.statusCode,
          error: result.body,
          successCount: this.successCount,
          errorCount: this.errorCount,
        });
      }
    } catch (error) {
      this.errorCount++;
      callback(null, {
        index: requestData.index,
        success: false,
        email: requestData.email,
        error: error.message,
        successCount: this.successCount,
        errorCount: this.errorCount,
      });
    }
  }

  makeRequest(requestData) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.baseUrl);
      const postData = JSON.stringify({
        name: requestData.name,
        email: requestData.email,
        age: requestData.age,
      });
      const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);
      
      const options = {
        hostname: urlObj.hostname,
        port: port,
        path: '/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: body,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  setTotalRequests(total) {
    this.totalRequests = total;
  }

  getStats() {
    return {
      successCount: this.successCount,
      errorCount: this.errorCount,
    };
  }
}

// Writable Stream: Escreve/loga cada resultado
class ResultLogger extends Writable {
  constructor(totalRequests) {
    super({ objectMode: true });
    this.totalRequests = totalRequests;
  }

  _write(result, encoding, callback) {
    if (result.success) {
      console.log(`✅ [${result.index.toLocaleString()}/${this.totalRequests.toLocaleString()}] (${result.progress}%) - Criado: ${result.email} | Taxa: ${result.rate} req/s | Sucessos: ${result.successCount.toLocaleString()} | Erros: ${result.errorCount.toLocaleString()}`);
    } else {
      console.log(`❌ [${result.index.toLocaleString()}] Erro ${result.statusCode || 'N/A'}: ${result.email} - ${result.error || ''}`);
    }
    callback();
  }
}

async function runTest(url, name) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 Testando: ${name}`);
  console.log(`📍 URL: ${url}`);
  console.log(`${'='.repeat(80)}\n`);

  const results = {
    get: null,
    post: null,
    getById: null,
  };

  // Teste 1: GET /users
  console.log('📊 Teste 1: GET /users');
  results.get = await autocannon({
    url,
    connections: 100,
    duration: 30,
    requests: [{ method: 'GET', path: '/users' }],
  });
  printResults(results.get, 'GET /users');

  // Teste 2: POST /users - 1 milhão de registros usando streams
  console.log('📊 Teste 2: POST /users (criar 1 milhão de usuários usando Streams)');
  console.log('⚠️  Este teste pode levar várias horas para completar...\n');
  console.log('💡 Processando sequencialmente sob demanda com Streams\n');
  
  const startTime = Date.now();
  const processId = process.pid;
  const totalRequests = 1000000;

  console.log(`📦 Configuração:`);
  console.log(`   Total de registros: ${totalRequests.toLocaleString()}`);
  console.log(`   Processamento: Sequencial sob demanda (Streams)\n`);

  const requestGenerator = new RequestGenerator(startTime, processId, totalRequests);
  const requestProcessor = new RequestProcessor(url);
  requestProcessor.setTotalRequests(totalRequests);
  const resultLogger = new ResultLogger(totalRequests);

  requestGenerator
    .pipe(requestProcessor)
    .pipe(resultLogger);

  await new Promise((resolve, reject) => {
    resultLogger.on('finish', resolve);
    resultLogger.on('error', reject);
    requestProcessor.on('error', reject);
    requestGenerator.on('error', reject);
  });

  const totalTime = (Date.now() - startTime) / 1000;
  const avgRate = totalRequests / totalTime;
  const stats = requestProcessor.getStats();

  console.log(`\n📊 Resumo Final:`);
  console.log(`   Total processado: ${totalRequests.toLocaleString()}`);
  console.log(`   Sucessos: ${stats.successCount.toLocaleString()}`);
  console.log(`   Erros: ${stats.errorCount.toLocaleString()}`);
  console.log(`   Taxa de sucesso: ${((stats.successCount / totalRequests) * 100).toFixed(2)}%`);
  console.log(`   Tempo total: ${(totalTime / 60).toFixed(2)} minutos`);
  console.log(`   Taxa média: ${avgRate.toFixed(2)} req/s\n`);
  
  results.post = {
    requests: { total: totalRequests, average: avgRate },
    latency: { average: 0, p50: 0, p99: 0 },
    errors: stats.errorCount,
    throughput: { average: 0 },
  };
  printResults(results.post, 'POST /users (Total: 1 milhão)');

  // Teste 3: GET /users/:id
  console.log('📊 Teste 3: GET /users/:id');
  results.getById = await autocannon({
    url,
    connections: 100,
    duration: 30,
    requests: [{ method: 'GET', path: '/users/1' }],
  });
  printResults(results.getById, 'GET /users/:id');

  return results;
}

function printResults(results, testName) {
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`${testName}`);
  console.log(`${'-'.repeat(60)}`);
  console.log(`📈 Requests: ${results.requests.total} (${results.requests.average.toFixed(2)}/s)`);
  console.log(`⚡ Latência: ${results.latency.average.toFixed(2)}ms (p50: ${results.latency.p50}ms, p99: ${results.latency.p99}ms)`);
  console.log(`✅ Taxa de sucesso: ${((results.requests.total - results.errors) / results.requests.total * 100).toFixed(2)}%`);
  console.log(`❌ Erros: ${results.errors}`);
  console.log(`🔥 Throughput: ${(results.throughput.average / 1024).toFixed(2)} KB/s`);
}

function compareResults(fastifyResults, elysiaResults) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 COMPARAÇÃO: Fastify vs Elysia');
  console.log(`${'='.repeat(80)}\n`);

  const tests = ['get', 'post', 'getById'];
  const testNames = {
    get: 'GET /users',
    post: 'POST /users',
    getById: 'GET /users/:id',
  };

  tests.forEach((test) => {
    const fastify = fastifyResults[test];
    const elysia = elysiaResults[test];

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Teste: ${testNames[test]}`);
    console.log(`${'='.repeat(80)}`);

    // Requests/s
    const fastifyRps = fastify.requests.average;
    const elysiaRps = elysia.requests.average;
    const rpsDiff = ((elysiaRps - fastifyRps) / fastifyRps * 100).toFixed(2);
    console.log(`\n📈 Requests/s:`);
    console.log(`  Fastify: ${fastifyRps.toFixed(2)} req/s`);
    console.log(`  Elysia:  ${elysiaRps.toFixed(2)} req/s`);
    console.log(`  Diferença: ${rpsDiff}% (${elysiaRps > fastifyRps ? 'Elysia' : 'Fastify'} é mais rápido)`);

    // Latência média
    const fastifyLat = fastify.latency.average;
    const elysiaLat = elysia.latency.average;
    const latDiff = ((fastifyLat - elysiaLat) / fastifyLat * 100).toFixed(2);
    console.log(`\n⚡ Latência média:`);
    console.log(`  Fastify: ${fastifyLat.toFixed(2)}ms`);
    console.log(`  Elysia:  ${elysiaLat.toFixed(2)}ms`);
    console.log(`  Diferença: ${latDiff}% (${elysiaLat < fastifyLat ? 'Elysia' : 'Fastify'} é mais rápido)`);

    // P99
    console.log(`\n📊 P99 (percentil 99):`);
    console.log(`  Fastify: ${fastify.latency.p99}ms`);
    console.log(`  Elysia:  ${elysia.latency.p99}ms`);

    // Throughput
    const fastifyTh = fastify.throughput.average / 1024;
    const elysiaTh = elysia.throughput.average / 1024;
    console.log(`\n🔥 Throughput:`);
    console.log(`  Fastify: ${fastifyTh.toFixed(2)} KB/s`);
    console.log(`  Elysia:  ${elysiaTh.toFixed(2)} KB/s`);
  });
}

async function main() {
  console.log('🚀 Iniciando testes de carga comparativos...\n');

  const fastifyResults = await runTest(FASTIFY_URL, 'Fastify (Node.js)');
  const elysiaResults = await runTest(ELYSIA_URL, 'Elysia (Bun.js)');

  compareResults(fastifyResults, elysiaResults);
}

main().catch(console.error);

