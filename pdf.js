const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

const BASE_URL = 'https://app.epackers.in/view-quotation.aspx';

// Add URL builder function
const buildUrl = (params) => {
  const { sr, cid, dn, action } = params;
  if (!sr || !cid || !dn || !action) {
    throw new Error('Missing required parameters: sr, cid, dn, and action are required');
  }
  return `${BASE_URL}?sr=${sr}&cid=${cid}&dn=${dn}&action=${action}`;
};

app.get('/generate-pdf', async (req, res) => {
  let browser = null;
  try {
    const { sr, cid, dn, action } = req.query;
    
    const urlToConvert = buildUrl({ sr, cid, dn, action });
    console.log('Generated URL:', urlToConvert);

    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    console.log(`Navigating to ${urlToConvert}...`);
    await page.goto(urlToConvert, { waitUntil: 'networkidle0', timeout: 60000 });

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    if (browser) {
      await browser.close();
      console.log('Browser closed successfully');
    }

    const filePath = path.join(__dirname, 'output.pdf');
    fs.writeFileSync(filePath, pdfBuffer);
    console.log('PDF file written successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      }
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('PDF Generation Error:', error);
    res.status(500).json({
      error: 'Error generating PDF',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});