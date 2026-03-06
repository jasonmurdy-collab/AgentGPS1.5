/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const path = require('path');
const WebSocket = require('ws');
const cors = require('cors');
const { URLSearchParams, URL } = require('url');
const rateLimit = require('express-rate-limit');
const twilio = require('twilio');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*', // In production, you might want to restrict this to your actual app domains
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Goog-Api-Key'],
    credentials: true
}));
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
// Support either API key env-var variant
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

const staticPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, 'public');


if (!apiKey) {
    // Only log an error, don't exit. The server will serve apps without proxy functionality
    console.error("Warning: GEMINI_API_KEY or API_KEY environment variable is not set! Proxy functionality will be disabled.");
}
else {
  console.log("API KEY FOUND (proxy will use this)")
}

// Limit body size to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.set('trust proxy', 1 /* number of proxies between user and server */)

// Rate limiter for the proxy
const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Set ratelimit window at 15min (in ms)
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // no `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}. Path: ${req.path}`);
        res.status(options.statusCode).send(options.message);
    }
});

// Apply the rate limiter to the /api-proxy route before the main proxy logic
app.use('/api-proxy', proxyLimiter);

// Proxy route for Gemini API calls (HTTP)
app.use('/api-proxy', async (req, res, next) => {
    console.log(req.ip);
    // If the request is an upgrade request, it's for WebSockets, so pass to next middleware/handler
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next(); // Pass to the WebSocket upgrade handler
    }

    if (req.body) { // Only log body if it exists
        console.log("  Request Body (from frontend):", req.body);
    }
    try {
        // Construct the target URL by taking the part of the path after /api-proxy/
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
        console.log(`HTTP Proxy: Forwarding request to ${apiUrl}`);

        // Prepare headers for the outgoing request
        const outgoingHeaders = {};
        // Copy most headers from the incoming request
        for (const header in req.headers) {
            // Exclude host-specific headers and others that might cause issues upstream
            if (!['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions'].includes(header.toLowerCase())) {
                outgoingHeaders[header] = req.headers[header];
            }
        }

        // Set the actual API key in the appropriate header
        outgoingHeaders['X-Goog-Api-Key'] = apiKey;

        // Set Content-Type from original request if present (for relevant methods)
        if (req.headers['content-type'] && ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            outgoingHeaders['Content-Type'] = req.headers['content-type'];
        } else if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            // Default Content-Type to application/json if no content type for post/put/patch
            outgoingHeaders['Content-Type'] = 'application/json';
        }

        // For GET or DELETE requests, ensure Content-Type is NOT sent,
        // even if the client erroneously included it.
        if (['GET', 'DELETE'].includes(req.method.toUpperCase())) {
            delete outgoingHeaders['Content-Type']; // Case-sensitive common practice
            delete outgoingHeaders['content-type']; // Just in case
        }

        // Ensure 'accept' is reasonable if not set
        if (!outgoingHeaders['accept']) {
            outgoingHeaders['accept'] = '*/*';
        }


        const axiosConfig = {
            method: req.method,
            url: apiUrl,
            headers: outgoingHeaders,
            responseType: 'stream',
            validateStatus: function (status) {
                return true; // Accept any status code, we'll pipe it through
            },
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            // Explicitly stringify JSON bodies to ensure consistent serialization for Gemini API
            if (outgoingHeaders['Content-Type'] === 'application/json' && typeof req.body === 'object') {
                axiosConfig.data = JSON.stringify(req.body);
            } else {
                axiosConfig.data = req.body;
            }
        }
        // For GET, DELETE, etc., axiosConfig.data will remain undefined,
        // and axios will not send a request body.

        const apiResponse = await axios(axiosConfig);

        // Pass through response headers from Gemini API to the client
        for (const header in apiResponse.headers) {
            res.setHeader(header, apiResponse.headers[header]);
        }
        res.status(apiResponse.status);


        apiResponse.data.on('data', (chunk) => {
            res.write(chunk);
        });

        apiResponse.data.on('end', () => {
            res.end();
        });

        apiResponse.data.on('error', (err) => {
            console.error('Error during streaming data from target API:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Proxy error during streaming from target' });
            } else {
                // If headers already sent, we can't send a JSON error, just end the response.
                res.end();
            }
        });

    } catch (error) {
        console.error('Proxy error before request to target API:', error);
        if (!res.headersSent) {
            if (error.response) {
                const errorData = {
                    status: error.response.status,
                    message: error.response.data?.error?.message || 'Proxy error from upstream API',
                    details: error.response.data?.error?.details || null
                };
                res.status(error.response.status).json(errorData);
            } else {
                res.status(500).json({ error: 'Proxy setup error', message: error.message });
            }
        }
    }
});

// Route for sending SMS via Twilio
app.post('/api/send-sms', async (req, res) => {
    const { sid, token, from, to, body } = req.body;

    if (!sid || !token || !from || !to || !body) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required parameters: sid, token, from, to, and body are all required.' 
        });
    }

    try {
        const client = twilio(sid, token);
        const message = await client.messages.create({
            body: body,
            from: from,
            to: to
        });

        res.status(200).json({ 
            success: true, 
            messageSid: message.sid,
            status: message.status
        });
    } catch (error) {
        console.error('Twilio SMS error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send SMS via Twilio API' 
        });
    }
});

app.post('/api/calendar/create-event', async (req, res) => {
    const { accessToken, title, description, startTime, endTime, clientEmail } = req.body;
    
    if (!accessToken || !title || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        
        const calendar = google.calendar({ version: 'v3', auth });
        
        const event = {
            summary: title,
            description: description,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            conferenceData: {
                createRequest: {
                    requestId: Math.random().toString(36).substring(7),
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            },
            attendees: clientEmail ? [{ email: clientEmail }] : []
        };
        
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1
        });
        
        res.json({ hangoutLink: response.data.hangoutLink });
    } catch (error) {
        console.error('Calendar error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.post('/api/calendar/list-events', async (req, res) => {
    const { accessToken, timeMin, timeMax } = req.body;
    
    if (!accessToken) {
        return res.status(400).json({ error: 'Missing accessToken' });
    }

    try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        
        const calendar = google.calendar({ version: 'v3', auth });
        
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin || new Date().toISOString(),
            timeMax: timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        res.json({ events: response.data.items });
    } catch (error) {
        console.error('Calendar list error:', error);
        res.status(500).json({ error: 'Failed to list events' });
    }
});

app.get('/api/auth/google-calendar-url', (req, res) => {
    console.log("APP_URL:", process.env.APP_URL);
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/auth/callback`
    );

    const scopes = ['https://www.googleapis.com/auth/calendar.events.readonly'];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        redirect_uri: `${process.env.APP_URL}/auth/callback`
    });

    res.json({ url });
});

const webSocketInterceptorScriptTag = `<script src="/public/websocket-interceptor.js" defer></script>`;

// Prepare service worker registration script content
const serviceWorkerRegistrationScript = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load' , () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
} else {
  console.log('Service workers are not supported in this browser.');
}
</script>
`;

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

app.get('/service-worker.js', (req, res) => {
   return res.sendFile(path.join(publicPath, 'service-worker.js'));
});

// Serve index.html or placeholder based on API key and file availability
// This is the SPA fallback - it handles all GET requests that haven't been matched yet
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/api-proxy')) {
        return res.status(404).json({ error: 'Not Found' });
    }

    const placeholderPath = path.join(publicPath, 'placeholder.html');

    // Try to serve index.html
    console.log(`LOG: Route '${req.path}' accessed. Attempting to serve index.html as SPA fallback.`);
    const indexPath = path.join(staticPath, 'index.html');

    fs.readFile(indexPath, 'utf8', (err, indexHtmlData) => {
        if (err) {
            // index.html not found or unreadable, serve the original placeholder
            console.log('LOG: index.html not found or unreadable. Falling back to original placeholder.');
            return res.sendFile(placeholderPath);
        }

        // If API key is not set, serve original HTML without injection
        if (!apiKey) {
          console.log("LOG: API key not set. Serving original index.html without script injections.");
          return res.sendFile(indexPath);
        }

        // index.html found and apiKey set, inject scripts
        console.log("LOG: index.html read successfully. Injecting scripts.");
        let injectedHtml = indexHtmlData;


        if (injectedHtml.includes('<head>')) {
            // Inject WebSocket interceptor first, then service worker script
            injectedHtml = injectedHtml.replace(
                '<head>',
                `<head>${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}`
            );
            console.log("LOG: Scripts injected into <head>.");
        } else {
            console.warn("WARNING: <head> tag not found in index.html. Prepending scripts to the beginning of the file as a fallback.");
            injectedHtml = `${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}${indexHtmlData}`;
        }
        res.send(injectedHtml);
    });
});

// Start the HTTP server
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`HTTP proxy active on /api-proxy/**`);
    console.log(`WebSocket proxy active on /api-proxy/**`);
});

// Create WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith('/api-proxy/')) {
        if (!apiKey) {
            console.error("WebSocket proxy: API key not configured. Closing connection.");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (clientWs) => {
            console.log('Client WebSocket connected to proxy for path:', pathname);

            const targetPathSegment = pathname.substring('/api-proxy'.length);
            const clientQuery = new URLSearchParams(requestUrl.search);
            clientQuery.set('key', apiKey);
            const targetGeminiWsUrl = `${externalWsBaseUrl}${targetPathSegment}?${clientQuery.toString()}`;
            console.log(`Attempting to connect to target WebSocket: ${targetGeminiWsUrl}`);

            const geminiWs = new WebSocket(targetGeminiWsUrl, {
                protocol: request.headers['sec-websocket-protocol'],
            });

            const messageQueue = [];

            geminiWs.on('open', () => {
                console.log('Proxy connected to Gemini WebSocket');
                // Send any queued messages
                while (messageQueue.length > 0) {
                    const message = messageQueue.shift();
                    if (geminiWs.readyState === WebSocket.OPEN) {
                        // console.log('Sending queued message from client -> Gemini');
                        geminiWs.send(message);
                    } else {
                        // Should not happen if we are in 'open' event, but good for safety
                        console.warn('Gemini WebSocket not open when trying to send queued message. Re-queuing.');
                        messageQueue.unshift(message); // Add it back to the front
                        break; // Stop processing queue for now
                    }
                }
            });

            geminiWs.on('message', (message) => {
                // console.log('Message from Gemini -> client');
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(message);
                }
            });

            geminiWs.on('close', (code, reason) => {
                console.log(`Gemini WebSocket closed: ${code} ${reason.toString()}`);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close(code, reason.toString());
                }
            });

            geminiWs.on('error', (error) => {
                console.error('Error on Gemini WebSocket connection:', error);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close(1011, 'Upstream WebSocket error');
                }
            });

            clientWs.on('message', (message) => {
                if (geminiWs.readyState === WebSocket.OPEN) {
                    // console.log('Message from client -> Gemini');
                    geminiWs.send(message);
                } else if (geminiWs.readyState === WebSocket.CONNECTING) {
                    // console.log('Queueing message from client -> Gemini (Gemini still connecting)');
                    messageQueue.push(message);
                } else {
                    console.warn('Client sent message but Gemini WebSocket is not open or connecting. Message dropped.');
                }
            });

            clientWs.on('close', (code, reason) => {
                console.log(`Client WebSocket closed: ${code} ${reason.toString()}`);
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
                    geminiWs.close(code, reason.toString());
                }
            });

            clientWs.on('error', (error) => {
                console.error('Error on client WebSocket connection:', error);
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
                    geminiWs.close(1011, 'Client WebSocket error');
                }
            });
        });
    } else {
        console.log(`WebSocket upgrade request for non-proxy path: ${pathname}. Closing connection.`);
        socket.destroy();
    }
});
