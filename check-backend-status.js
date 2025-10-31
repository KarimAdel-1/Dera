#!/usr/bin/env node

/**
 * DERA PROTOCOL - BACKEND STATUS CHECKER
 * ======================================
 *
 * This script checks the status of all backend services
 * and provides a quick overview of what's running.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkService(name, port, path = '/health') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          name,
          port,
          status: res.statusCode === 200 ? 'running' : 'error',
          response: data
        });
      });
    });

    req.on('error', () => {
      resolve({
        name,
        port,
        status: 'stopped',
        response: null
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        port,
        status: 'timeout',
        response: null
      });
    });

    req.end();
  });
}

function checkConfigFiles() {
  const services = [
    'hcs-event-service',
    'node-staking-service',
    'liquidation-bot',
    'monitoring-service',
    'rate-limiting-service'
  ];

  const configStatus = {};

  for (const service of services) {
    const envPath = path.join(__dirname, 'backend', service, '.env');
    configStatus[service] = fs.existsSync(envPath);
  }

  return configStatus;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                            ║', 'cyan');
  log('║           DERA PROTOCOL - BACKEND STATUS CHECK            ║', 'cyan');
  log('║                                                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Check configuration files
  log('\n📋 Configuration Status:', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  const configStatus = checkConfigFiles();
  for (const [service, configured] of Object.entries(configStatus)) {
    const status = configured ? '✅ Configured' : '❌ Not configured';
    const color = configured ? 'green' : 'red';
    log(`   ${service.padEnd(25)} ${status}`, color);
  }

  const allConfigured = Object.values(configStatus).every(status => status);
  if (!allConfigured) {
    log('\n⚠️  Some services are not configured. Run "npm run setup:backend" first.', 'yellow');
  }

  // Check service status
  log('\n🔍 Service Status:', 'cyan');
  log('━'.repeat(60), 'cyan');

  const services = [
    { name: 'HCS Event Service', port: 3001 },
    { name: 'Node Staking Service', port: 3003 },
    { name: 'Monitoring Service', port: 3004 },
    { name: 'Rate Limiting Service', port: 3005 }
  ];

  const results = await Promise.all(
    services.map(service => checkService(service.name, service.port))
  );

  let runningCount = 0;
  for (const result of results) {
    let statusText, color;
    switch (result.status) {
      case 'running':
        statusText = '✅ Running';
        color = 'green';
        runningCount++;
        break;
      case 'error':
        statusText = '⚠️  Error';
        color = 'yellow';
        break;
      case 'timeout':
        statusText = '⏱️  Timeout';
        color = 'yellow';
        break;
      default:
        statusText = '❌ Stopped';
        color = 'red';
    }
    
    log(`   ${result.name.padEnd(25)} ${statusText} (Port ${result.port})`, color);
  }

  // Check Liquidation Bot (background service, no HTTP endpoint)
  log(`   ${'Liquidation Bot'.padEnd(25)} 🤖 Background service`, 'white');

  // Summary
  log('\n📊 Summary:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log(`   Services running: ${runningCount}/4`, runningCount === 4 ? 'green' : 'yellow');
  log(`   Services configured: ${Object.values(configStatus).filter(Boolean).length}/5`, 'white');

  // Instructions
  if (runningCount === 0) {
    log('\n🚀 To start all services:', 'cyan');
    log('   npm run start:backend:all', 'white');
  } else if (runningCount < 4) {
    log('\n🔧 Some services are not running. Check logs for errors.', 'yellow');
    log('   To restart all services:', 'cyan');
    log('   npm run start:backend:all', 'white');
  } else {
    log('\n✅ All services are running!', 'green');
  }

  if (!allConfigured) {
    log('\n⚙️  To configure services:', 'cyan');
    log('   npm run setup:backend', 'white');
  }

  log('\n📖 For more information:', 'cyan');
  log('   See backend/README.md', 'white');
}

main().catch(console.error);