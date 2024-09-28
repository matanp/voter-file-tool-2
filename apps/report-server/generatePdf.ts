import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

async function generatePDF(html: string) {
  // Launch a new browser instance
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set the content of the page
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
  });

  // Close the browser
  await browser.close();

  // Save the PDF file
  const outputPath = path.join(__dirname, 'output.pdf');
  await fs.writeFile(outputPath, pdfBuffer);

  console.log(`PDF generated and saved to: ${outputPath}`);
}

// generatePDF().catch(console.error);
