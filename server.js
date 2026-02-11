const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { connectWhatsApp, disconnectWhatsApp, getWhatsAppStatus, whatsapp } = require('./connection');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Basic security middleware
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

app.get('/status', (req, res) => {
    res.json(getWhatsAppStatus());
});

app.post('/connect', authenticate, async (req, res) => {
    try {
        await connectWhatsApp();
        res.json({ message: 'Connection initiated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/logout', authenticate, async (req, res) => {
    try {
        await disconnectWhatsApp();
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/groups', authenticate, async (req, res) => {
    if (!whatsapp.sock || whatsapp.status !== 'connected') {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    try {
        const groups = await whatsapp.sock.groupFetchAllParticipating();
        const result = Object.values(groups).map(g => ({
            id: g.id,
            name: g.subject,
            participants: g.participants.length
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/send', authenticate, upload.single('file'), async (req, res) => {
    if (!whatsapp.sock || whatsapp.status !== 'connected') {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    const { message, recipients } = req.body;
    const parsedRecipients = JSON.parse(recipients);
    const file = req.file;

    const results = [];
    for (const jid of parsedRecipients) {
        try {
            if (file) {
                await whatsapp.sock.sendMessage(jid, {
                    [file.mimetype.startsWith('video/') ? 'video' : 'image']: file.buffer,
                    caption: message,
                    mimetype: file.mimetype
                });
            } else {
                await whatsapp.sock.sendMessage(jid, { text: message });
            }
            results.push({ jid, status: 'sent' });
        } catch (error) {
            console.error(`Failed to send to ${jid}:`, error);
            results.push({ jid, status: 'failed', error: error.message });
        }
        // Small delay to prevent spam detection
        await new Promise(r => setTimeout(r, 1000));
    }

    res.json({ results });
});

app.listen(port, () => {
    console.log(`WhatsApp service listening on port ${port}`);
    // Auto-connect on start if session exists
    connectWhatsApp().catch(console.error);
});
