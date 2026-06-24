const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_KEY = process.env.ADMIN_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const DEPLOY_KEY = process.env.DEPLOY_KEY;

if (!ADMIN_PASSWORD || !JWT_SECRET || !APPS_SCRIPT_URL || !DEPLOY_KEY) {
    console.error('Missing required env vars');
}

const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://support-ranking-system.vercel.app',
        'https://support-ranking-system-3c9c4f4db.vercel.app'
    ],
    credentials: true
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' },
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts' },
    skipSuccessfulRequests: true,
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many admin actions' },
});

app.use('/api', apiLimiter);

function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

async function forwardToAppsScript(action, queryParams = '', body = null, method = 'GET') {
    const url = `${APPS_SCRIPT_URL}?action=${action}&key=${DEPLOY_KEY}${queryParams ? '&' + queryParams : ''}`;
    const options = { method };
    if (body && method === 'POST') {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
}

app.get('/api/tracks', async (req, res) => {
    try {
        const data = await forwardToAppsScript('getTracks');
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/tracks/:slug/students', async (req, res) => {
    try {
        const tracks = await forwardToAppsScript('getTracks');
        if (!Array.isArray(tracks)) return res.status(500).json({ error: 'Invalid tracks data' });

        const track = tracks.find(t => t.id === req.params.slug || t.slug === req.params.slug);
        if (!track || !track.sheet_id) return res.status(404).json({ error: 'Track or sheet not found' });

        const data = await forwardToAppsScript('getStudents', `sheetId=${encodeURIComponent(track.sheet_id)}`);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const { password, key } = req.body;
    const validPassword = bcrypt.compareSync(password || '', ADMIN_PASSWORD_HASH);
    const validKey = (key || '') === ADMIN_KEY;

    if (!validPassword || !validKey) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ role: 'admin', iat: Date.now() }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
});

app.use('/api/admin', requireAuth, adminLimiter);

app.post('/api/admin/:action', async (req, res) => {
    const action = req.params.action;
    const allowedActions = ['createTrack', 'updateTrack', 'deleteTrack', 'addStudent', 'updateStudents', 'deleteStudent'];

    if (!allowedActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const queryParams = req.query.sheetId ? `sheetId=${encodeURIComponent(req.query.sheetId)}` : '';
        const url = `${APPS_SCRIPT_URL}?action=${action}&key=${DEPLOY_KEY}${queryParams ? '&' + queryParams : ''}`;
        const fetchRes = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(req.body),
        });

        const text = await fetchRes.text();
        try { res.json(JSON.parse(text)); } catch { res.send(text); }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = serverless(app);