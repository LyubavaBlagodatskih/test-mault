const fs = require('fs');
const path = require('path');

function loadDotenv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

loadDotenv();

const REQUIRED = ['API_BASE_URL'];
const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
}

const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
const VALID_NODE_ENVS = ['development', 'staging', 'production'];

const config = {
    apiBaseUrl: process.env.API_BASE_URL,
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
};

if (!VALID_NODE_ENVS.includes(config.nodeEnv)) {
    console.error(`Invalid NODE_ENV: ${config.nodeEnv}. Must be one of: ${VALID_NODE_ENVS.join(', ')}`);
    process.exit(1);
}

if (!VALID_LOG_LEVELS.includes(config.logLevel)) {
    console.error(`Invalid LOG_LEVEL: ${config.logLevel}. Must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
    process.exit(1);
}

if (Number.isNaN(config.port) || config.port < 1 || config.port > 65535) {
    console.error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
    process.exit(1);
}

if (require.main === module) {
    console.log('Environment OK:', config);
}

module.exports = config;
