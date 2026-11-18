import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';

import { initDatabase } from './db/index.js';
import { runSeed } from './db/seed.js';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import timelineRoutes from './routes/timelineRoutes.js';
import findingsRoutes from './routes/findingsRoutes.js';
import notesRoutes from './routes/notesRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security hardening
app.use(
  helmet({
    contentSecurityPolicy: false, // Customized for DFIR report rendering and API mode
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize SQLite database and seed demo investigation
try {
  initDatabase();
  runSeed();
} catch (err) {
  console.error('[TraceLock Startup Error]', err);
}

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OPERATIONAL',
    system: 'TraceLock Digital Forensics Platform',
    version: '1.0.0-PROD',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api', evidenceRoutes);
app.use('/api/cases', timelineRoutes);
app.use('/api/cases', findingsRoutes);
app.use('/api/cases', notesRoutes);
app.use('/api/cases', reportRoutes);
app.use('/api/audit', auditRoutes);

// Serve static frontend files if built
const clientDist = path.resolve(process.cwd(), '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.method === 'GET') {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Central Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Exception]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// Only listen if not imported as module in test
if (process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  TRACELOCK DIGITAL EVIDENCE & FORENSICS SERVER`);
    console.log(`  Secure Evidence. Trusted Investigations.`);
    console.log(`  Listening on: http://localhost:${PORT}`);
    console.log(`  Environment: Production-Grade DFIR Suite`);
    console.log(`=======================================================`);
  });
}

export default app;
