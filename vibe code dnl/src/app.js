// src/app.js
// Main Express app for Todo API
require('dotenv').config();
const express = require('express');
const { checkConnection } = require('./db');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const loadsRouter = require('./routes/loads');
const driversRouter = require('./routes/drivers');
const documentsRouter = require('./routes/documents');
const driverDocumentsRouter = require('./routes/driverDocuments');
const agreementsRouter = require('./routes/agreements');
const agreementTemplateRouter = require('./routes/agreementTemplate');
const uploadsRouter = require('./routes/uploads');
const path = require('path');
const { requireAuth, requireRole } = require('./middleware/auth');
const { applyApiSecurityHeaders, getJwtSecret } = require('./config/security');

// ...existing code...
const puppeteer = require('puppeteer');

const cors = require('cors');
const app = express();

getJwtSecret();

function parseCsvEnv(name) {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const corsAllowList = parseCsvEnv('CORS_ORIGIN');
app.use(
  cors(
    corsAllowList.length
      ? {
          origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            return callback(null, corsAllowList.includes(origin));
          }
        }
      : undefined
  )
); // If CORS_ORIGIN is unset, keep current permissive behavior.
app.use(applyApiSecurityHeaders);
app.use(express.json());
// ...existing code...

const assignmentsRouter = require('./routes/assignments');
const companyDetailsRouter = require('./routes/companyDetails');
const invoicesRouter = require('./routes/invoices');
const settlementsRouter = require('./routes/settlements');

// const app = express();
// app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the Vibe API');
});

// Mount routers
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/loads', loadsRouter);
app.use('/api/drivers', driversRouter);
app.use('/api/drivers', driverDocumentsRouter);

// Public agreement signing (token links)
app.use('/api/agreements', agreementsRouter);

// Agreement template (company editable)
app.use('/api/agreement-template', agreementTemplateRouter);

// Route for dispatcher-driver assignments
app.use('/api/assignments', assignmentsRouter);

// Route for company details
app.use('/api/company', companyDetailsRouter);

// Route for documents
app.use('/api', documentsRouter);

// Serve uploaded files (RBAC protected except agreements)
app.use('/uploads', uploadsRouter);

// Route for invoices
app.use('/api/invoices', invoicesRouter);

// Route for weekly settlements
app.use('/api/settlements', settlementsRouter);


// Puppeteer screenshot API
function isPrivateOrLocalHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return true;
  if (host.endsWith('.local')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map((x) => Number(x));
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

app.get('/api/screenshot', requireAuth, requireRole('admin'), async (req, res) => {
  console.log('Screenshot API called with query:', req.query);
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter.' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(String(url));
  } catch {
    return res.status(400).json({ error: 'Invalid url.' });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http(s) URLs are allowed.' });
  }
  if (parsedUrl.username || parsedUrl.password) {
    return res.status(400).json({ error: 'Credentials in URL are not allowed.' });
  }

  const screenshotAllowedHosts = parseCsvEnv('SCREENSHOT_ALLOWED_HOSTS');
  if (screenshotAllowedHosts.length) {
    if (!screenshotAllowedHosts.includes(parsedUrl.hostname)) {
      return res.status(403).json({ error: 'Host is not allowlisted for screenshots.' });
    }
  } else if (isPrivateOrLocalHostname(parsedUrl.hostname)) {
    return res.status(403).json({ error: 'Local/private hosts are not allowed for screenshots.' });
  }

  try {
    const launchOptions = {};
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    if (process.env.PUPPETEER_DISABLE_SANDBOX === '1') {
      launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30_000);
    await page.goto(parsedUrl.toString(), { waitUntil: 'networkidle2' });
    const screenshot = await page.screenshot({ encoding: 'base64' });
    await browser.close();
    res.json({ screenshot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// src/app/api/screenshot/route.js
// export async function GET(request) {
//   const url = request.nextUrl.searchParams.get('url');
//   if (!url) {
//     return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
//   }

//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.goto(url, { waitUntil: 'networkidle0' });

//   const pdfBuffer = await page.pdf({
//     format: 'A4',
//     printBackground: true,
//   });

//   await browser.close();

//   return new Response(pdfBuffer, {
//     headers: {
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': 'attachment; filename=invoice.pdf',
//     },
//   });
// }






const PORT = process.env.PORT || 5000;

// Check DB connection before starting server
(async () => {
  const connected = await checkConnection();
  if (!connected) {
    console.error('Server not started due to DB connection failure.');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

module.exports = app;
