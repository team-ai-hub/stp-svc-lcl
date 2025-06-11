const express = require('express');
const cors = require('cors');
const path = require('path');
const printer = require('pdf-to-printer');
const fs = require('fs');
const { Builder, By, Key, until } = require('selenium-webdriver');


let driver;
let originalWindowHandle;
let url1;
let url2;
let labelPath;
let lblPrinter = undefined;
let invPrinter = undefined;

const app = express();
app.use(cors());
app.use(express.json()); // To parse JSON body

const pdfFolder = __dirname; // 'D:/filefolders'; // Your local PDFs

async function readUrlsFromFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

function loadConfig() {
  try {
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    if (!config.url1 || !config.url2) {
      throw new Error('Config must include "tab1" and "tab2" URLs.');
    }

    labelPath = config.outputPath;
    url1 = config.url1;
    url2 = config.url2;

    if (config.labelPrinterName) lblPrinter = config.labelPrinterName;
    if (config.invoicePrinterName) invPrinter = config.invoicePrinterName;

    console.log(`URL1 : ${url1}\nURL2 : ${url2}\nLabel Printer : ${lblPrinter}\nInvoice Printer : ${invPrinter}`);
    console.log(`Label Path : ${labelPath}`);
  } catch (err) {
    console.error('Error reading config.json:', err.message);
    process.exit(1);
  }
}


(async () => {

  loadConfig();

  driver = await new Builder().forBrowser('chrome').build();

  // First tab - example site
  await driver.get(url1);
  originalWindowHandle = await driver.getWindowHandle();

  // Open second tab with a form
  await driver.executeScript(`window.open("${url2}");`);
})();

app.post('/vms', async (req, res) => {

  const handles = await driver.getAllWindowHandles();

  console.log(req.body.data);
  console.log(req.body.waitTimer);

  if (handles.length < 2) {
    return res.status(400).send('Second window not available');
  }

  // Switch to second window
  console.log('Switching to second window...');
  await driver.switchTo().window(handles[1]);

  // Wait for the input field
  const inputSelector = By.className('ant-input');// By.name('fname');
  await driver.wait(until.elementLocated(inputSelector), 10000);
  const input = await driver.findElement(inputSelector);

  // Type into the input field
  await input.clear();
  await input.sendKeys(Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE);
  console.log("Set Backspace 01");
  await input.sendKeys(Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE);
  console.log("Set Backspace 02");
  await input.sendKeys(Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE, Key.BACK_SPACE);
  console.log("Set Backspace 03");
  //await driver.wait(1000);
  await input.sendKeys(req.body.data,Key.RETURN);//,Key.RETURN);

  // Wait 10 seconds
  console.log('Waiting 10 seconds...');
  await new Promise(resolve => setTimeout(resolve,15000));// req.body.waitTimer));

  // Switch back to original window
  console.log('Switching back to original window...');
  await driver.switchTo().window(originalWindowHandle);
});

// API to trigger print
app.post('/pdf/print', async (req, res) => {
  console.log(req.body);
  const { fileName } = req.body;
  const { invFileName } = req.body;

  console.log(fileName);
  console.log(invFileName);

  if (!fileName || invFileName) return res.status(400).send('Missing file name');

  try {
    if (fileName) {
      const filePath = path.join(labelPath, fileName);
      await printer.print(filePath, {
        printer: lblPrinter, // undefined, // Default printer  "Microsoft Print to PDF", //
        win32: ['-print-settings', 'fit']
      });
    }

    if (invFileName) {
      const filePath = path.join(labelPath, invFileName);
      await printer.print(filePath, {
        printer: invFileName, // undefined, // Default printer  "Microsoft Print to PDF", //
        win32: ['-print-settings', 'fit']
      });
    }


    res.send({ "status": 'Print job sent successfully.' });

  } catch (error) {
    console.error('Error printing PDF:', error);
    res.status(500).send('Failed to print.');
  }
});


// API to test file access
app.get('/pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const fullPath = path.join(pdfFolder, filename);
  res.sendFile(fullPath);
});

app.get('/pdf/prob', (req, res) => { res.send('success'); });


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});




// cd node-server
// npm install express cors pdf-to-printer
