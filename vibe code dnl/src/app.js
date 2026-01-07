// src/app.js
// Main Express app for Todo API
const express = require('express');
const { checkConnection } = require('./db');
const usersRouter = require('./routes/users');
const loadsRouter = require('./routes/loads');
const driversRouter = require('./routes/drivers');
const documentsRouter = require('./routes/documents');
const path = require('path');

// ...existing code...
const puppeteer = require('puppeteer');

const cors = require('cors');
const app = express();
app.use(cors()); // Allow all origins by default
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
app.use('/api/users', usersRouter);
app.use('/api/loads', loadsRouter);
app.use('/api/drivers', driversRouter);

// Route for dispatcher-driver assignments
app.use('/api/assignments', assignmentsRouter);

// Route for company details
app.use('/api/company', companyDetailsRouter);

// Route for documents
app.use('/api', documentsRouter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Route for invoices
app.use('/api/invoices', invoicesRouter);

// Route for weekly settlements
app.use('/api/settlements', settlementsRouter);


// Puppeteer screenshot API
app.get('/api/screenshot', async (req, res) => {
  console.log('Screenshot API called with query:', req.query);
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter.' });
  }
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
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
