/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const { URLSearchParams, URL } = require('url');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

// Paths corrected to look at root when running from /server
const staticPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, '..', 'public');

if (!apiKey) {
    console.error("Warning: API_KEY not set! Proxy functionality disabled.");
} else {
    console.log("Backend proxy initialized with API Key.");
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.set('trust proxy', 1);

const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * TWILIO SMS PROXY
 */
app.post('/api/send-sms', async (req, res) => {
    const { sid, token, from, to, body } = req.body;

    if (!sid || !token || !from || !to || !body) {
        return res.status(400).json({ error: 'Missing parameters.' });
    }

    try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
        const auth = Buffer.from(`${sid}:${token}`).toString('base64');

        const params = new URLSearchParams();
        params.append('To', to);
        params.append('From', from);
        params.append('Body', body);

        const response = await axios.post(twilioUrl, params, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        res.status(200).json({ success: true, messageSid: response.data.sid });
    } catch (error) {
        console.error('Twilio Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'SMS failed.',
            details: error.response?.data?.message || error.message 
        });
    }
});

// Proxy route for Gemini API calls
app.use('/api-proxy', proxyLimiter, async (req, res, next) => {
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next(); 
    }

    try {
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
        const outgoingHeaders = {};
        for (const header in req.headers) {
            if (!['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions'].includes(header.toLowerCase())) {
                outgoingHeaders[header] = req.headers[header];
            }
        }
        outgoingHeaders['X-Goog-Api-Key'] = apiKey;

        const axiosConfig = {
            method: req.method,
            url: apiUrl,
            headers: outgoingHeaders,
            responseType: 'stream',
            validateStatus: () => true,
        };
        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            axiosConfig.data = req.body;
        }
        const apiResponse = await axios(axiosConfig);
        for (const header in apiResponse.headers) {
            res.setHeader(header, apiResponse.headers[header]);
        }
        res.status(apiResponse.status);
        apiResponse.data.pipe(res);
    } catch (error) {
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy error' });
        }
    }
});

app.get('/', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Application not built. Run 'npm run build' first.");
    }
});

app.use(express.static(staticPath));

const server = app.listen(port, () => {
    console.log(`Unified Server listening on port ${port}`);
});

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname;
    if (pathname.startsWith('/api-proxy/')) {
        if (!apiKey) { socket.destroy(); return; }
        wss.handleUpgrade(request, socket, head, (clientWs) => {
            const targetPathSegment = pathname.substring('/api-proxy'.length);
            const clientQuery = new URLSearchParams(requestUrl.search);
            clientQuery.set('key', apiKey);
            const targetGeminiWsUrl = `${externalWsBaseUrl}${targetPathSegment}?${clientQuery.toString()}`;
            const geminiWs = new WebSocket(targetGeminiWsUrl, {
                protocol: request.headers['sec-websocket-protocol'],
            });
            const messageQueue = [];
            geminiWs.on('open', () => {
                while (messageQueue.length > 0) {
                    const message = messageQueue.shift();
                    if (geminiWs.readyState === WebSocket.OPEN) { geminiWs.send(message); }
                }
            });
            geminiWs.on('message', (message) => {
                if (clientWs.readyState === WebSocket.OPEN) { clientWs.send(message); }
            });
            geminiWs.on('close', (code, reason) => {
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) { clientWs.close(code, reason.toString()); }
            });
            clientWs.on('message', (message) => {
                if (geminiWs.readyState === WebSocket.OPEN) { geminiWs.send(message); }
                else if (geminiWs.readyState === WebSocket.CONNECTING) { messageQueue.push(message); }
            });
            clientWs.on('close', (code, reason) => {
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) { geminiWs.close(code, reason.toString()); }
            });
        });
    } else {
        socket.destroy();
    }
});