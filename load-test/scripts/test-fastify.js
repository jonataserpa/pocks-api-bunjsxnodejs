const http = require('http');
const autocannon = require('autocannon');
const { Readable, Transform, Writable } = require('stream');

/**
 * Script de teste de carga otimizado para Fastify
 * 
 * Variáveis de ambiente:
 * - FASTIFY_URL: URL do servidor (padrão: http://localhost:3000)
 * - CONCURRENCY: Número de requisições simultâneas (padrão: 100)
 * - BATCH_SIZE: Tamanho do batch para logs (padrão: 1000)
 * - TOTAL_REQUESTS: Total de requisições a fazer (padrão: 1000000)
 * 
 * Exemplos de uso:
 *   npm run test:fastify
 *   CONCURRENCY=200 npm run test:fastify
 *   CONCURRENCY=50 BATCH_SIZE=500 npm run test:fastify
 *   TOTAL_REQUESTS=10000 CONCURRENCY=50 npm run test:fastify
 */

const BASE_URL = process.env.FASTIFY_URL || 'http://localhost:3000';
const DEFAULT_CONCURRENCY = parseInt(process.env.CONCURRENCY || '100', 10);
const DEFAULT_BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '1000', 10);
const DEFAULT_TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '1000000', 10);

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

// Transform Stream: Processa requisições em paralelo com concorrência controlada e batching
class RequestProcessor extends Transform {
  constructor(baseUrl, concurrency = 100, batchSize = 1000) {
    super({ objectMode: true, highWaterMark: concurrency * 2 });
    this.baseUrl = baseUrl;
    this.concurrency = concurrency;
    this.batchSize = batchSize;
    this.successCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    this.pendingRequests = new Map();
    this.processedCount = 0;
    this.waitingQueue = [];
    this.lastBatchLog = 0;
    this.batchStartTime = Date.now();
  }

  _transform(requestData, encoding, callback) {
    // Adiciona à fila de processamento
    this.processRequest(requestData);
    // Não espera, permite que o stream continue gerando dados
    callback();
  }

  async processRequest(requestData) {
    // Se já atingiu o limite de concorrência, adiciona à fila de espera
    if (this.pendingRequests.size >= this.concurrency) {
      await new Promise(resolve => {
        this.waitingQueue.push(resolve);
      });
    }

    // Adiciona à lista de requisições pendentes
    this.pendingRequests.set(requestData.index, requestData);

    // Processa a requisição em paralelo
    this.makeRequest(requestData)
      .then(result => {
        this.pendingRequests.delete(requestData.index);
        this.handleResult(requestData, result);
        // Libera uma vaga para a próxima requisição na fila
        this.processNextInQueue();
      })
      .catch(error => {
        this.pendingRequests.delete(requestData.index);
        this.handleError(requestData, error);
        // Libera uma vaga para a próxima requisição na fila
        this.processNextInQueue();
      });
  }

  processNextInQueue() {
    if (this.waitingQueue.length > 0 && this.pendingRequests.size < this.concurrency) {
      const resolve = this.waitingQueue.shift();
      resolve();
    }
  }

  handleResult(requestData, result) {
    if (result.success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }

    this.processedCount++;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const rate = (this.processedCount / elapsed).toFixed(2);
    const progress = ((this.processedCount / this.totalRequests) * 100).toFixed(2);

    // Log de batch a cada BATCH_SIZE requisições
    const batchNumber = Math.floor(this.processedCount / this.batchSize);
    if (batchNumber > this.lastBatchLog) {
      this.lastBatchLog = batchNumber;
      const batchElapsed = ((Date.now() - this.batchStartTime) / 1000).toFixed(1);
      const batchRate = (this.batchSize / batchElapsed).toFixed(2);
      console.log(`\n📦 Batch ${batchNumber} completado: ${this.batchSize.toLocaleString()} requisições em ${batchElapsed}s (${batchRate} req/s)`);
      console.log(`   Total: ${this.processedCount.toLocaleString()}/${this.totalRequests.toLocaleString()} (${progress}%) | Sucessos: ${this.successCount.toLocaleString()} | Erros: ${this.errorCount.toLocaleString()}\n`);
      this.batchStartTime = Date.now();
    }

    // Passa o resultado para o próximo stream (apenas para logs detalhados se necessário)
    const resultData = {
      index: requestData.index,
      success: result.success,
      email: requestData.email,
      statusCode: result.statusCode,
      elapsed,
      rate,
      progress,
      successCount: this.successCount,
      errorCount: this.errorCount,
      error: result.success ? undefined : result.body,
    };

    this.push(resultData);
  }

  handleError(requestData, error) {
    this.errorCount++;
    this.processedCount++;
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const rate = (this.processedCount / elapsed).toFixed(2);
    const progress = ((this.processedCount / this.totalRequests) * 100).toFixed(2);

    // Determina o tipo de erro e mensagem
    let errorMessage = error.message || String(error);
    let errorType = 'UNKNOWN';
    
    if (error.code === 'ECONNREFUSED') {
      errorType = 'CONNECTION_REFUSED';
      errorMessage = `Servidor não está respondendo em ${this.baseUrl}`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      errorType = 'TIMEOUT';
      errorMessage = 'Timeout na requisição';
    } else if (error.code === 'ENOTFOUND') {
      errorType = 'DNS_ERROR';
      errorMessage = `Host não encontrado: ${error.hostname || 'N/A'}`;
    } else if (error.code) {
      errorType = error.code;
    }

    // Log de batch mesmo em caso de erro
    const batchNumber = Math.floor(this.processedCount / this.batchSize);
    if (batchNumber > this.lastBatchLog) {
      this.lastBatchLog = batchNumber;
      const batchElapsed = ((Date.now() - this.batchStartTime) / 1000).toFixed(1);
      const batchRate = (this.batchSize / batchElapsed).toFixed(2);
      console.log(`\n📦 Batch ${batchNumber} completado: ${this.batchSize.toLocaleString()} requisições em ${batchElapsed}s (${batchRate} req/s)`);
      console.log(`   Total: ${this.processedCount.toLocaleString()}/${this.totalRequests.toLocaleString()} (${progress}%) | Sucessos: ${this.successCount.toLocaleString()} | Erros: ${this.errorCount.toLocaleString()}\n`);
      this.batchStartTime = Date.now();
    }

    this.push({
      index: requestData.index,
      success: false,
      email: requestData.email,
      statusCode: null,
      error: errorMessage,
      errorType: errorType,
      elapsed,
      rate,
      progress,
      successCount: this.successCount,
      errorCount: this.errorCount,
    });
  }

  _flush(callback) {
    // Aguarda todas as requisições pendentes e a fila de espera terminarem
    const checkPending = () => {
      if (this.pendingRequests.size === 0 && this.waitingQueue.length === 0) {
        callback();
      } else {
        setTimeout(checkPending, 100);
      }
    };
    checkPending();
  }

  makeRequest(requestData, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.baseUrl);
      const postData = JSON.stringify({
        name: requestData.name,
        email: requestData.email,
        age: requestData.age,
      });
      
      // Determina a porta corretamente
      let port = urlObj.port;
      if (!port || port === '') {
        // Se não há porta na URL, usa a padrão baseada no protocolo
        port = urlObj.protocol === 'https:' ? 443 : 80;
      } else {
        port = parseInt(port, 10);
      }

      const options = {
        hostname: urlObj.hostname,
        port: port,
        path: '/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Connection': 'keep-alive', // Reutiliza conexões para melhor performance
        },
        timeout: timeout,
        keepAlive: true, // Mantém conexões abertas
        keepAliveMsecs: 1000,
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

      req.on('timeout', () => {
        req.destroy();
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'ETIMEDOUT';
        reject(timeoutError);
      });

      req.setTimeout(timeout);

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
    // Logs detalhados apenas para erros ou a cada 10000 requisições para não poluir o console
    if (!result.success) {
      const statusInfo = result.statusCode ? `HTTP ${result.statusCode}` : (result.errorType || 'ERRO');
      console.log(`❌ [${result.index.toLocaleString()}] ${statusInfo}: ${result.email} - ${result.error || 'Erro desconhecido'}`);
    } else if (result.index % 10000 === 0) {
      // Log a cada 10k sucessos para acompanhar progresso sem poluir muito
      console.log(`✅ [${result.index.toLocaleString()}/${this.totalRequests.toLocaleString()}] (${result.progress}%) - Taxa: ${result.rate} req/s | Sucessos: ${result.successCount.toLocaleString()} | Erros: ${result.errorCount.toLocaleString()}`);
    }
    callback();
  }
}

async function checkServerHealth(baseUrl) {
  return new Promise((resolve) => {
    const urlObj = new URL(baseUrl);
    let port = urlObj.port;
    if (!port || port === '') {
      port = urlObj.protocol === 'https:' ? 443 : 80;
    } else {
      port = parseInt(port, 10);
    }

    const options = {
      hostname: urlObj.hostname,
      port: port,
      path: '/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ success: res.statusCode === 200, statusCode: res.statusCode, body });
      });
    });

    req.on('error', (error) => {
      let errorMessage = error.message || 'Erro de conexão';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = `Conexão recusada - servidor não está rodando na porta ${port}`;
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout - servidor não respondeu a tempo';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = `Host não encontrado: ${urlObj.hostname}`;
      }
      resolve({ success: false, error: errorMessage, code: error.code });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout', code: 'ETIMEDOUT' });
    });

    req.setTimeout(5000);
    req.end();
  });
}

async function runTest() {
  console.log('🚀 Iniciando teste de carga para Fastify (Node.js)...\n');
  console.log(`📍 URL: ${BASE_URL}\n`);

  // Verificar se o servidor está respondendo
  console.log('🔍 Verificando saúde do servidor...');
  const healthCheck = await checkServerHealth(BASE_URL);
  if (!healthCheck.success) {
    console.error(`\n❌ Servidor não está respondendo!`);
    console.error(`   ${healthCheck.error || 'Erro desconhecido'}`);
    if (healthCheck.code) {
      console.error(`   Código de erro: ${healthCheck.code}`);
    }
    console.error(`\n💡 Para iniciar o servidor:`);
    console.error(`   1. cd api-nodejs-fastify`);
    console.error(`   2. npm run dev`);
    console.error(`\n   Ou verifique se o servidor está rodando em outra porta.`);
    console.error(`   Você pode definir a URL com: FASTIFY_URL=http://localhost:PORTA node scripts/test-fastify.js\n`);
    process.exit(1);
  }
  console.log(`✅ Servidor está respondendo (Status: ${healthCheck.statusCode})\n`);

  // Teste 1: GET /users (listar)
  console.log('📊 Teste 1: GET /users (listar todos)');
  const getTest = await autocannon({
    url: BASE_URL,
    connections: 100,
    duration: 30,
    requests: [
      {
        method: 'GET',
        path: '/users',
      },
    ],
  });
  printResults(getTest, 'GET /users');

  // Teste 2: POST /users (criar registros usando streams otimizado)
  console.log('\n📊 Teste 2: POST /users (criar usuários usando Streams otimizado)');
  console.log('💡 Processando em paralelo com concorrência controlada e batching\n');

  const startTime = Date.now();
  const processId = process.pid;
  const totalRequests = DEFAULT_TOTAL_REQUESTS;
  const concurrency = DEFAULT_CONCURRENCY;
  const batchSize = DEFAULT_BATCH_SIZE;

  console.log(`📦 Configuração:`);
  console.log(`   Total de registros: ${totalRequests.toLocaleString()}`);
  console.log(`   Concorrência: ${concurrency} requisições simultâneas`);
  console.log(`   Batch size: ${batchSize.toLocaleString()} (logs a cada batch)`);
  console.log(`   Processamento: Paralelo otimizado com logs por batch\n`);
  
  console.log(`💡 Para ajustar:`);
  console.log(`   CONCURRENCY=200 BATCH_SIZE=2000 npm run test:fastify`);
  console.log(`   TOTAL_REQUESTS=10000 CONCURRENCY=50 npm run test:fastify\n`);

  // Criar os streams
  const requestGenerator = new RequestGenerator(startTime, processId, totalRequests);
  const requestProcessor = new RequestProcessor(BASE_URL, concurrency, batchSize);
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

  printResults({
    requests: { total: totalRequests, average: avgRate },
    latency: { average: 0, p50: 0, p99: 0 },
    errors: stats.errorCount,
    throughput: { average: 0 },
  }, 'POST /users (Total: 1 milhão)');

  // Teste 3: GET /users/:id (buscar por ID)
  console.log('\n📊 Teste 3: GET /users/:id (buscar por ID)');
  const getByIdTest = await autocannon({
    url: BASE_URL,
    connections: 100,
    duration: 30,
    requests: [
      {
        method: 'GET',
        path: '/users/1',
      },
    ],
  });
  printResults(getByIdTest, 'GET /users/:id');
}

function printResults(results, testName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Resultados: ${testName}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📈 Requests: ${results.requests.total} (${results.requests.average}/s)`);
  console.log(`⚡ Latência: ${results.latency.average}ms (p50: ${results.latency.p50}ms, p99: ${results.latency.p99}ms)`);
  console.log(`✅ Sucesso: ${results.requests.total - results.errors} (${((results.requests.total - results.errors) / results.requests.total * 100).toFixed(2)}%)`);
  console.log(`❌ Erros: ${results.errors}`);
  console.log(`🔥 Throughput: ${(results.throughput.average / 1024).toFixed(2)} KB/s`);
  console.log(`${'='.repeat(60)}\n`);
}

runTest().catch(console.error);

