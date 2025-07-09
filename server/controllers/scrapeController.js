
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const Job = require('../models/Job');
const { checkRobotsTxt } = require('../utils/scraper');

exports.scrape = async (req, res) => {
  const { url, username, password, captchaSolver, dynamic, selectors, preview } = req.body;

  if (!url || !selectors || !selectors.length) {
    return res.status(400).json({ error: 'URL and selectors are required' });
  }

  try {
    const isAllowed = await checkRobotsTxt(url);
    if (!isAllowed) {
      return res.status(403).json({ error: 'Scraping not allowed by robots.txt' });
    }

    let data = [];
    if (dynamic === 'yes') {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      if (username && password) {
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.type('#username', username); // Update selector as needed
        await page.type('#password', password);
        await page.click('#login-button');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      } else {
        await page.goto(url, { waitUntil: 'networkidle2' });
      }

      if (captchaSolver) {
        console.log('CAPTCHA solver enabled (not implemented)');
      }

      data = await page.evaluate((sels) => {
        return sels.map(sel => ({
          element: sel.element,
          values: Array.from(document.querySelectorAll(sel.selector)).map(el => el.innerText),
        }));
      }, selectors);

      await browser.close();
    } else {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      data = selectors.map(sel => ({
        element: sel.element,
        values: $(sel.selector).map((i, el) => $(el).text()).get(),
      }));
    }

    if (preview) {
      data = data.map(item => ({
        ...item,
        values: item.values.slice(0, 5),
      }));
    }

    if (!preview) {
      const job = new Job({
        userId: req.user._id,
        url,
        selectors,
        status: 'completed',
        results: data,
        createdAt: new Date(),
      });
      await job.save();
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to scrape data' });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ userId: req.user._id });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};
