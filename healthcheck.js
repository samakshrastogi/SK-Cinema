
// healthcheck.js
const { exec } = require('child_process');
const axios = require('axios');

// Configurable URLs
const DB_URL = process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/dbname';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Check PostgreSQL connection
function checkPostgres() {
    return new Promise((resolve) => {
        exec(`pg_isready -d "${DB_URL}"`, (err, stdout, stderr) => {
            if (err) return resolve({ status: false, message: stderr || err.message });
            if (stdout.includes('accepting connections')) return resolve({ status: true, message: 'PostgreSQL is running.' });
            resolve({ status: false, message: stdout });
        });
    });
}

// Check backend (expects /api/user endpoint)
function checkBackend() {
    return axios.get(`${BACKEND_URL}/api/user`)
        .then(() => ({ status: true, message: 'Backend API is responding.' }))
        .catch((err) => ({ status: false, message: err.response ? err.response.data : err.message }));
}

// Check frontend (root URL)
function checkFrontend() {
    return axios.get(`${FRONTEND_URL}`)
        .then(() => ({ status: true, message: 'Frontend is responding.' }))
        .catch((err) => ({ status: false, message: err.response ? err.response.data : err.message }));
}

async function runChecks() {
    console.log('--- Project Health Check ---');

    // DB
    const db = await checkPostgres();
    console.log(`Database: ${db.status ? '✅' : '❌'} ${db.message}`);

    // Backend
    const backend = await checkBackend();
    console.log(`Backend: ${backend.status ? '✅' : '❌'} ${backend.message}`);

    // Frontend
    const frontend = await checkFrontend();
    console.log(`Frontend: ${frontend.status ? '✅' : '❌'} ${frontend.message}`);

    console.log('---------------------------');
}

runChecks();

// -----------------------------
// How to run this script:
// -----------------------------
// 1. Open a terminal in your project root folder (sk-cinema).
// 2. Install dependencies:
//    npm install axios
// 3. Make sure PostgreSQL, backend, and frontend servers are running.
// 4. Optionally set environment variables (DATABASE_URL, BACKEND_URL, FRONTEND_URL).
// 5. Run the script:
//    node healthcheck.js
// -----------------------------
