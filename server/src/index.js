import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import linksRouter from './routes/links.js';
import redirect from './routes/redirect.js';
import dns from 'dns';

if (process.env.USE_GOOGLE_DNS === 'true') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/links', linksRouter);

// In production the built React app is served from here too
const dist = path.join(__dirname, '../../client/dist');
const hasClient = fs.existsSync(dist);
if (hasClient) app.use(express.static(dist));

app.get('/:code([A-Za-z0-9_-]{3,30})', redirect);

if (hasClient) {
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.' });
});

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/linkvault')
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
