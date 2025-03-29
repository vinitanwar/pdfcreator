const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pdf = require('html-pdf');
const axios = require('axios');

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

const BASE_URL = 'https://app.epackers.in/view-quotation.aspx';

// Function to build URL with query parameters
const buildUrl = (params) => {
  const { sr, cid, dn, action } = params;
  if (!sr || !cid || !dn || !action) {
    throw new Error('Missing required parameters: sr, cid, dn, and action are required');
  }
  return `${BASE_URL}?sr=${sr}&cid=${cid}&dn=${dn}&action=${action}`;
};

app.get('/generate-pdf', async (req, res) => {
  try {
    const { sr, cid, dn, action } = req.query;
    const urlToConvert = buildUrl({ sr, cid, dn, action });
    console.log('Generated URL:', urlToConvert);

    // Fetch the HTML content
    const response = await axios.get(urlToConvert);
    const htmlContent = response.data;

    console.log('Generating PDF...');
    pdf.create(htmlContent, { format: 'A4' }).toFile('output.pdf', (err, result) => {
      if (err) {
        console.error('PDF Generation Error:', err);
        return res.status(500).json({ error: 'Error generating PDF', details: err.message });
      }

      console.log('PDF file saved successfully');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');
      res.sendFile(result.filename, (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        try {
          if (fs.existsSync(result.filename)) {
            fs.unlinkSync(result.filename);
          }
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Error fetching page content', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
