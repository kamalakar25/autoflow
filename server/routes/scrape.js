const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const WebSocket = require('ws');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();
const xlsx = require('xlsx');
const Result = require('../models/resultSchema');
const User = require('../models/User');
const Workflow = require('../models/workflowSchema');

puppeteer.use(StealthPlugin());

const wss = new WebSocket.Server({ noServer: true });
const activeSessions = new Map();
const proxies = [
  { host: 'proxy1.example.com', port: 8080, username: 'user', password: 'pass' },
  // Replace with your proxy provider's details
];
let proxyIndex = 0;

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db('scraper');
}
connectDB().catch(console.error);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access Denied: No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.id || decoded.userId }; // Support both 'id' and 'userId'
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Access Denied: Invalid token' });
  }
};

const getNextProxy = () => {
  const proxy = proxies[proxyIndex];
  proxyIndex = (proxyIndex + 1) % proxies.length;
  return proxy;
};

const solveCaptcha = async (page) => {
  console.log('CAPTCHA detected. Implement 2Captcha solver: https://2captcha.com/');
  return new Promise((resolve) => setTimeout(resolve, 5000)); // Mock delay
};

const retry = async (fn, retries = 3, delayMs = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

wss.on('connection', (ws, request) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    if (data.action === 'start-recording' && data.url) {
      try {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = await startRecordingSession(data.url, ws);
        activeSessions.set(sessionId, { ...session, ws });
        ws.send(JSON.stringify({ message: 'Recording started', sessionId }));
      } catch (error) {
        ws.send(JSON.stringify({ error: 'Failed to start recording', details: error.message }));
      }
    }
  });

  ws.on('close', () => {
    activeSessions.forEach((session, sessionId) => {
      if (session.ws === ws) {
        if (session.browser) session.browser.close().catch(console.error);
        activeSessions.delete(sessionId);
      }
    });
  });
});

const startRecordingSession = async (url, ws) => {
  const proxy = getNextProxy();
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    args: [
      `--proxy-server=${proxy.host}:${proxy.port}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
    ],
    userDataDir: './user_data',
  });

  const page = (await browser.pages())[0];
  await page.authenticate({ username: proxy.username, password: proxy.password });
  await page.setUserAgent(new UserAgent().toString());

  await page.setRequestInterception(true);
  page.on('request', (request) => request.continue());

  const setupEventMonitoring = async (currentPage) => {
    await currentPage.evaluateOnNewDocument(() => {
      window.puppeteerEvents = [];
      document.addEventListener('click', (e) => {
        const eventData = {
          action: 'click',
          x: e.clientX,
          y: e.clientY,
          selector: e.target.tagName.toLowerCase(),
          timestamp: Date.now(),
          text: e.target.textContent.trim().substring(0, 20) || '',
          className: e.target.className || '',
        };
        window.puppeteerEvents.push(eventData);
      });
    });

    const pollEvents = setInterval(async () => {
      const events = await currentPage.evaluate(() => {
        const events = window.puppeteerEvents;
        window.puppeteerEvents = [];
        return events;
      });
      events.forEach(event => ws.send(JSON.stringify(event)));
    }, 500);

    return pollEvents;
  };

  page.on('framenavigated', async () => {
    await setupEventMonitoring(page);
  });

  await setupEventMonitoring(page);
  await retry(() => page.goto(url, { waitUntil: ['load', 'networkidle2'] }));
  return { browser, page };
};

const scrapePage = async ({ url, username, password, dynamic = 'yes', workflow = [], jobId, workflowId }) => {
  let results = [];
  const proxy = getNextProxy();

  const validateName = (name) => {
 
    if (!name) return '';
    const invalidPatterns = [
      'linkedin', 'profile', 'home', 'login', 'sign in', 'sign up', 'about', 'contact',
      'welcome', 'dashboard', 'careers', 'jobs', 'company', 'network', 'messaging',
      'notifications', 'search', 'menu', 'nav', 'navbar', 'header'
    ];
    const cleanedName = name.trim().replace(/\|.*$/, '').replace(/\s*\-\s*.*$/, '').trim();
    if (cleanedName.length < 5 || cleanedName.split(/\s+/).length < 2) return '';
    if (invalidPatterns.some(pattern => cleanedName.toLowerCase().includes(pattern))) return '';
    if (!/\s/.test(cleanedName)) return '';
    return cleanedName;
  };

  if (dynamic === 'yes') {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        // `--proxy-server=${proxy.host}:${proxy.port}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      userDataDir: './user_data',
    });

    const page = await browser.newPage();
    // await page.authenticate({ username: proxy.username, password: proxy.password });
    await page.setUserAgent(new UserAgent().toString());

    try {
      await retry(async () => {
        await page.goto(url, { waitUntil: ['load', 'networkidle2'], timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
      });

      if (username && password) {
        await retry(async () => {
          const loginUrl = url.includes('linkedin.com') ? 'https://www.linkedin.com/login' : url;
          await page.goto(loginUrl, { waitUntil: ['load', 'networkidle2'] });
          const emailInput = await page.$('input[name="session_key"], input[type="email"], input[placeholder*="email"]');
          const passwordInput = await page.$('input[name="session_password"], input[type="password"], input[placeholder*="password"]');
          const submitButton = await page.$('button[type="submit"], button[data-id="sign-in-form__submit-btn"]');

          if (!emailInput || !passwordInput || !submitButton) {
            throw new Error('Login fields not found');
          }

          await emailInput.type(username, { delay: 100 });
          await passwordInput.type(password, { delay: 100 });
          await submitButton.click();
          await page.waitForNavigation({ waitUntil: ['load', 'networkidle2'], timeout: 15000 }).catch(() => {});

          if (await page.$('iframe[src*="captcha"]')) {
            await solveCaptcha(page);
            await submitButton.click();
            await page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] });
          }

          if (page.url().includes('login')) {
            throw new Error('Login failed');
          }
        });

        await page.goto(url, { waitUntil: ['load', 'networkidle2'] });
      }

      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });

      const contactButton = await page.$('a[href*="contact-info"], button[aria-label*="Contact info"]');
      if (contactButton) {
        await contactButton.click();
        await page.waitForSelector('.pv-profile-section__section-info, .pv-contact-info__ci-container', { timeout: 10000 }).catch(() => {});
      }

      const contactData = await page.evaluate(() => {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
        const emails = [];
        const phones = [];
        let name = '';

        const selectors = [
          'h1.text-heading-xlarge',
          '.pv-top-card--list li:first-child',
          '[class*="pv-top-card"] h1',
          '[itemprop="name"]',
          'h1:not([class*="nav"]):not([class*="header"])',
          'h2:not([class*="nav"]):not([class*="header"])',
          'meta[property="og:title"]',
          'title'
        ];
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const candidateName = element.textContent?.trim() || element.content?.trim() || '';
            const validatedName = candidateName && !['linkedin', 'profile', 'home', 'login', 'sign in', 'sign up', 'about', 'contact', 'nav', 'navbar', 'header', 'menu', 'dashboard', 'careers', 'jobs', 'company', 'network', 'messaging', 'notifications', 'search'].some(invalid => candidateName.toLowerCase().includes(invalid))
              ? candidateName.replace(/\|.*$/, '').replace(/\s*\-\s*.*$/, '').trim()
              : '';
            if (validatedName && validatedName.length >= 5 && /\s/.test(validatedName)) {
              name = validatedName;
              console.log(`Dynamic name extracted from selector: ${selector}, value: ${name}`);
              break;
            }
          }
        }

        document.querySelectorAll('.pv-contact-info__ci-container, .pv-profile-section__section-info, body').forEach(el => {
          const text = el.textContent.trim();
          const emailMatches = text.match(emailRegex);
          const phoneMatches = text.match(phoneRegex);
          if (emailMatches) emails.push(...emailMatches);
          if (phoneMatches) phones.push(...phoneMatches);
        });

        console.log('Dynamic scraping extracted:', { name, emails, phones });
        return { emails: [...new Set(emails)], phones: [...new Set(phones)], name };
      });

      const maxLength = Math.max(contactData.emails.length, contactData.phones.length, contactData.name ? 1 : 0);
      results = [];
      for (let i = 0; i < maxLength; i++) {
        results.push({
          values: [
            contactData.name || 'N/A',
            contactData.emails[i] || 'N/A',
            contactData.phones[i] || 'N/A',
          ],
        });
      }

      if (results.length === 0) {
        results.push({ values: ['N/A', 'N/A', 'N/A'] });
      }

      console.log('Dynamic scraping results:', JSON.stringify(results, null, 2));

      for (const action of workflow) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (action.action === 'click') {
          await page.mouse.click(action.x, action.y);
        } else if (action.action === 'type') {
          await page.type(action.selector, action.value);
        }
      }

      await browser.close();
    } catch (error) {
      console.error('Dynamic scraping error:', error.message);
      await browser.close();
      results = [{ values: ['N/A', 'Error during scraping', error.message] }];
    }
  } else {
    try {
      const response = await axios.get(url, {
        proxy: { host: proxy.host, port: proxy.port, auth: { username: proxy.username, password: proxy.password } },
      });
      const $ = cheerio.load(response.data);
      const emails = [];
      const phones = [];
      let name = '';

      const selectors = [
        'h1.text-heading-xlarge',
        '.pv-top-card--list li:first-child',
        '[class*="pv-top-card"] h1',
        '[itemprop="name"]',
        'h1:not([class*="nav"]):not([class*="header"])',
        'h2:not([class*="nav"]):not([class*="header"])',
        'meta[property="og:title"]',
        'title'
      ];
      for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length) {
          const candidateName = element.text()?.trim() || element.attr('content')?.trim() || '';
          const validatedName = validateName(candidateName);
          if (validatedName) {
            name = validatedName;
            console.log(`Static name extracted from selector: ${selector}, value: ${name}`);
            break;
          }
        }
      }

      $('body').find('*').each((i, el) => {
        const text = $(el).text();
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        const phoneMatch = text.match(/\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g);
        if (emailMatch) emails.push(...emailMatch);
        if (phoneMatch) phones.push(...phoneMatch);
      });

      console.log('Static scraping extracted:', { name, emails, phones });

      const staticMaxLength = Math.max(emails.length, phones.length, name ? 1 : 0);
      results = [];
      for (let i = 0; i < staticMaxLength; i++) {
        results.push({
          values: [
            name || 'N/A',
            emails[i] || 'N/A',
            phones[i] || 'N/A',
          ],
        });
      }

      if (results.length === 0) {
        results.push({ values: ['N/A', 'N/A', 'N/A'] });
      }

      console.log('Static scraping results:', JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('Static scraping error:', error.message);
      results = [{ values: ['N/A', 'Error during static scraping', error.message] }];
    }
  }

  return { jobId, results };
};

router.post('/schedule-job', authenticateToken, async (req, res) => {
  const { jobId, url, schedule, config, workflowId } = req.body;
  if (!url || !jobId) return res.status(400).json({ message: 'URL and jobId are required' });
  try {
    await db.collection('jobs').insertOne({
      jobId,
      url,
      schedule,
      config,
      workflowId,
      userId: req.user.userId,
      status: 'pending',
      createdAt: new Date(),
    });
    console.log(`Scheduled job ${jobId} for user ${req.user.userId} under workflow ${workflowId}`);
    res.json({ message: 'Job scheduled successfully', jobId });
  } catch (error) {
    console.error('Error scheduling job:', error.message);
    res.status(500).json({ message: 'Server error during scheduling', details: error.message });
  }
});

router.post('/scrape', authenticateToken, async (req, res) => {
  const { url, username = '', password = '', dynamic = 'yes', workflow = [], jobId, workflowId } = req.body;
  if (!url) return res.status(400).json({ message: 'URL is required' });

  try {
    const robotsUrl = new URL('/robots.txt', url).toString();
    const robotsResponse = await axios.get(robotsUrl).catch(() => ({ data: '' }));
    if (robotsResponse.data.includes('Disallow: /in/') && url.includes('linkedin.com/in/')) {
      return res.status(403).json({ message: 'Scraping LinkedIn profiles disallowed by robots.txt' });
    }

    const data = await scrapePage({ url, username, password, dynamic, workflow, jobId, workflowId });
    if (jobId) {
      await db.collection('jobs').updateOne(
        { jobId, userId: req.user.userId, workflowId },
        { $set: { status: 'completed', completedAt: new Date() } }
      );
    }
    res.json(data);
  } catch (error) {
    if (jobId) {
      await db.collection('jobs').updateOne(
        { jobId, userId: req.user.userId, workflowId },
        { $set: { status: 'failed', error: error.message, completedAt: new Date() } }
      );
    }
    console.error('Scrape error:', error.message);
    res.status(500).json({ message: 'Server error during scraping', details: error.message });
  }
});

router.post('/save-results', authenticateToken, async (req, res) => {
  const { jobId, csv, workflowId } = req.body;
  if (!jobId || !csv) return res.status(400).json({ message: 'Job ID and CSV data are required' });
  try {
    await db.collection('results').updateOne(
      { jobId, userId: req.user.userId, workflowId },
      { $set: { csv, createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`Saved results for job ${jobId} under workflow ${workflowId}`);
    res.json({ message: 'Results saved successfully' });
  } catch (error) {
    console.error('Error saving results:', error.message);
    res.status(500).json({ message: 'Server error during saving results', details: error.message });
  }
});

router.get('/results/:jobId', authenticateToken, async (req, res) => {
  const { jobId } = req.params;
  const { workflowId } = req.query;
  try {
    const result = await db.collection('results').findOne({ jobId, userId: req.user.userId, workflowId });
    if (!result) return res.status(404).json({ message: 'Results not found for this job' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=job_${jobId}.csv`);
    res.send(result.csv);
  } catch (error) {
    console.error('Error retrieving results:', error.message);
    res.status(500).json({ message: 'Server error retrieving results', details: error.message });
  }
});

router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await db.collection('jobs').find({ userId: req.user.userId }).toArray();
    const jobData = await Promise.all(jobs.map(async (job) => {
      const result = await db.collection('results').findOne({ jobId: job.jobId, userId: req.user.userId, workflowId: job.workflowId });
      return {
        id: job.jobId,
        url: job.url,
        datetime: job.schedule.datetime,
        recurrence: job.schedule.recurrence,
        status: job.status,
        results: result ? result.csv.split('\n').slice(1).map(row => ({ values: row.split(',') })) : [],
        workflowId: job.workflowId,
      };
    }));
    console.log(`Fetched ${jobData.length} jobs for user ${req.user.userId}`);
    res.json(jobData);
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    res.status(500).json({ message: 'Server error fetching jobs', details: error.message });
  }
});

router.post('/save-excel', authenticateToken, async (req, res) => {
  const { jobId, workflowId, excelData } = req.body;
  const userId = req.user.userId; // Extracted from JWT

  try {
    // Validate inputs
    if (!jobId || !workflowId || !excelData) {
      return res.status(400).json({ message: 'Missing required fields: jobId, workflowId, or excelData' });
    }

    // Validate or convert workflowId to ObjectId
    let validWorkflowId = workflowId;
    if (!ObjectId.isValid(workflowId)) {
      const workflow = await Workflow.findOne({ id: workflowId }); // Use 'id' field from workflowSchema
      if (!workflow) {
        return res.status(400).json({ message: `Invalid workflowId: Workflow with id ${workflowId} not found` });
      }
      validWorkflowId = workflow._id;
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(excelData, 'base64');

    // Parse Excel data for storage
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Generate CSV from parsed data
    const headers = ['Name', 'Email', 'Phone', 'Company', 'JobTitle', 'LinkedIn', 'EmailStatus', 'Domain'];
    const csvRows = data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');

    // Create new result document
    const result = new Result({
      jobId,
      workflowId: validWorkflowId,
      userId,
      fileName: `job_${jobId}.xlsx`,
      fileData: buffer,
      data,
      csv, // Add the generated CSV
    });

    // Save result to database
    await result.save();

    // Update user's savedResults
    await User.findByIdAndUpdate(
      userId,
      { $push: { savedResults: result._id } },
      { new: true }
    );

    res.status(200).json({ message: 'Excel file saved successfully.', resultId: result._id });
  } catch (error) {
    console.error('Error saving Excel file:', error);
    res.status(500).json({ message: 'Failed to save Excel file.', details: error.message });
  }
});

router.get('/results', authenticateToken, async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user.userId })
      .select('jobId fileName createdAt')
      .lean();
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Failed to fetch results.' });
  }
});

router.get('/results/:resultId/download', authenticateToken, async (req, res) => {
  try {
    const result = await Result.findOne({
      _id: req.params.resultId,
      userId: req.user.userId,
    });

    if (!result) {
      return res.status(404).json({ message: 'Result not found or access denied.' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);
    res.send(result.fileData);
  } catch (error) {
    console.error('Error downloading result:', error);
    res.status(500).json({ message: 'Failed to download result.' });
  }
});

module.exports = { router, wss };