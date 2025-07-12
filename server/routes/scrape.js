const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cheerio = require("cheerio");
const playwright = require("playwright");
const UserAgent = require("user-agents");
const WebSocket = require("ws");
const { MongoClient, ObjectId } = require("mongodb");
const cron = require("node-cron");
const router = express.Router();
const xlsx = require("xlsx");
const Result = require("../models/resultSchema");
const User = require("../models/User");
const Workflow = require("../models/workflowSchema");

const wss = new WebSocket.Server({ noServer: true });
const activeSessions = new Map();

const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
});
let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("scraper");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}
connectDB();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res
      .status(401)
      .json({ message: "Access Denied: No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.id || decoded.userId };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Access Denied: Invalid token" });
  }
};

const solveCaptcha = async (page) => {
  console.log("CAPTCHA detected. Simulating 2Captcha solver integration.");
  await page.waitForTimeout(3000);
  return true;
};

const retry = async (fn, retries = 3, delayMs = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
};

// Helper function to format results to CSV
const formatResultsToCsv = (results) => {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Company",
    "JobTitle",
    "LinkedIn",
    "EmailStatus",
    "Domain",
  ];
  const rows = results.map((result) => {
    const values = [
      result.name || result.values?.[0] || "",
      result.email || result.values?.[1] || "",
      result.phone || result.values?.[2] || "",
      result.company || result.enriched?.company || "",
      result.jobTitle || result.enriched?.jobTitle || "",
      result.linkedin || result.enriched?.linkedin || "",
      result.emailStatus || result.enriched?.emailStatus || "unknown",
      result.domain || result.enriched?.domain || "",
    ];
    return values
      .map((val) => `"${val.toString().replace(/"/g, '""')}"`)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
};

// Scheduler for running scheduled jobs
const startScheduler = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const jobs = await db
        .collection("jobs")
        .find({
          status: "pending",
          "schedule.datetime": { $lte: now },
        })
        .toArray();

      for (const job of jobs) {
        console.log(`Processing scheduled job ${job.jobId} for URL ${job.url}`);
        await db
          .collection("jobs")
          .updateOne(
            { jobId: job.jobId },
            { $set: { status: "running", startedAt: new Date() } }
          );

        try {
          const data = await scrapePage({
            url: job.url,
            username: job.config?.username || "",
            password: job.config?.password || "",
            dynamic: job.config?.dynamic || "yes",
            workflow: job.config?.workflow || [],
            jobId: job.jobId,
            workflowId: job.workflowId,
            browser: job.config?.browser || "chromium",
            enrich: job.config?.enrich || false,
          });

          await db
            .collection("results")
            .updateOne(
              {
                jobId: job.jobId,
                userId: job.userId,
                workflowId: job.workflowId,
              },
              {
                $set: {
                  csv: formatResultsToCsv(data.results),
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

          await db
            .collection("jobs")
            .updateOne(
              { jobId: job.jobId },
              { $set: { status: "completed", completedAt: new Date() } }
            );
        } catch (error) {
          console.error(`Job ${job.jobId} failed: ${error.message}`);
          await db
            .collection("jobs")
            .updateOne(
              { jobId: job.jobId },
              {
                $set: {
                  status: "failed",
                  error: error.message,
                  completedAt: new Date(),
                },
              }
            );
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error.message);
    }
  });
  console.log("Scheduler started, checking for jobs every minute");
};
startScheduler();

wss.on("connection", (ws, request) => {
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.action === "start-recording" && data.url) {
        const sessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const session = await startRecordingSession(data.url, ws, data.browser);
        activeSessions.set(sessionId, { ...session, ws });
        ws.send(JSON.stringify({ message: "Recording started", sessionId }));
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          error: "Failed to start recording",
          details: error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    activeSessions.forEach((session, sessionId) => {
      if (session.ws === ws) {
        if (session.browser) session.browser.close().catch(console.error);
        activeSessions.delete(sessionId);
      }
    });
  });
});

const startRecordingSession = async (url, ws, browserType = "chromium") => {
  const validBrowsers = ["chromium", "firefox", "webkit"];
  if (!validBrowsers.includes(browserType)) {
    throw new Error(
      `Invalid browser type: ${browserType}. Must be one of ${validBrowsers.join(
        ", "
      )}`
    );
  }

  console.log(
    `Starting recording session for ${url} with browser: ${browserType}`
  );
  const browser = await playwright[browserType].launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    userAgent: new UserAgent().toString(),
  });

  const page = await context.newPage();

  const setupEventMonitoring = async (currentPage) => {
    await currentPage.evaluateOnNewDocument(() => {
      window.playwrightEvents = [];
      document.addEventListener("click", (e) => {
        const eventData = {
          action: "click",
          x: e.clientX,
          y: e.clientY,
          selector: e.target.tagName.toLowerCase(),
          timestamp: Date.now(),
          text: e.target.textContent.trim().substring(0, 20) || "",
          className: e.target.className || "",
        };
        window.playwrightEvents.push(eventData);
      });
    });

    const pollEvents = setInterval(async () => {
      const events = await currentPage.evaluate(() => {
        const events = window.playwrightEvents;
        window.playwrightEvents = [];
        return events;
      });
      events.forEach((event) => ws.send(JSON.stringify(event)));
    }, 500);

    return pollEvents;
  };

  page.on("framenavigated", async () => {
    await setupEventMonitoring(page);
  });

  await setupEventMonitoring(page);
  await retry(() =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
  );
  return { browser, page };
};

const scrapePage = async ({
  url,
  username,
  password,
  dynamic = "yes",
  workflow = [],
  jobId,
  workflowId,
  browser = "chromium",
  enrich = false,
}) => {
  let results = [];

  const validBrowsers = ["chromium", "firefox", "webkit"];
  if (!validBrowsers.includes(browser)) {
    console.error(`Invalid browser type: ${browser}. Defaulting to chromium.`);
    browser = "chromium";
  }

  const validateName = (name) => {
    if (!name || typeof name !== "string") return "";
    const cleanedName = name
      .trim()
      .replace(/\|.*$/, "")
      .replace(/\s*-\s*.*$/, "")
      .trim();
    if (cleanedName.length < 2) return "";
    return cleanedName;
  };

  const validateEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim()) ? email.trim() : "";
  };

  const validatePhone = (phone) => {
    if (!phone || typeof phone !== "string") return "";
    const phoneRegex = /^\+?[\d\s()-]{7,}(?:\s*(?:ext\.?|x)\s*\d+)?$/;
    return phoneRegex.test(phone.trim()) ? phone.trim() : "";
  };

  const extractDomain = (email) => {
    if (!validateEmail(email)) return "";
    return email.split("@")[1]?.trim() || "";
  };

  const enrichData = async (contactData) => {
    try {
      const enriched = {
        company: "",
        jobTitle: "",
        linkedin: "",
        emailStatus: "unknown",
        domain: extractDomain(contactData.email),
      };

      if (validateEmail(contactData.email)) {
        // Mock enrichment - in production, integrate with real APIs
        enriched.company = "Example Corp";
        enriched.jobTitle = "Software Engineer";
        enriched.emailStatus = "deliverable";
        enriched.linkedin = "example-profile";
      }

      return {
        ...contactData,
        enriched,
      };
    } catch (error) {
      console.error("Enrichment error:", error.message);
      return {
        ...contactData,
        enriched: {
          company: "",
          jobTitle: "",
          linkedin: "",
          emailStatus: "unknown",
          domain: extractDomain(contactData.email),
        },
      };
    }
  };

  const extractData = async (source, isDynamic, page) => {
    const nameSelectors = [
      "h1",
      "h2",
      'meta[property="og:title"]',
      'meta[name="title"]',
      "title",
      '[itemprop="name"]',
      ".profile-name, .user-name, .name",
      ".pv-text-details__left-panel h1",
      ".text-heading-xlarge",
    ];

    let $ = null;
    if (!isDynamic) {
      $ = cheerio.load(source);
    }

    const emails = [];
    const phones = [];
    let name = "";

    // Enhanced name extraction
    for (const selector of nameSelectors) {
      let candidateName = "";
      if (isDynamic) {
        try {
          const element = await page.$(selector);
          candidateName = (await element?.textContent())?.trim() || "";
        } catch (e) {
          continue;
        }
      } else {
        const element = $(selector).first();
        candidateName =
          element.text()?.trim() || element.attr("content")?.trim() || "";
      }
      const validatedName = validateName(candidateName);
      if (validatedName) {
        name = validatedName;
        console.log(
          `Name extracted from selector: ${selector}, value: ${name}`
        );
        break;
      }
    }

    // Enhanced email and phone extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex =
      /(?:\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})|(\d{5})[-.\s]?(\d{5})|(\d{10})/g;

    if (isDynamic) {
      try {
        const text = await page.evaluate(() => document.body.textContent);
        const emailMatches = text.match(emailRegex) || [];
        const phoneMatches = text.match(phoneRegex) || [];

        emailMatches.forEach((email) => {
          const validEmail = validateEmail(email);
          if (validEmail && !emails.includes(validEmail)) {
            emails.push(validEmail);
          }
        });

        phoneMatches.forEach((phone) => {
          const validPhone = validatePhone(phone);
          if (validPhone && !phones.includes(validPhone)) {
            phones.push(validPhone);
          }
        });
      } catch (e) {
        console.error("Error extracting contact info:", e.message);
      }
    } else {
      $("body")
        .find("*")
        .each((i, el) => {
          const text = $(el).text();
          const emailMatch = text.match(emailRegex);
          const phoneMatch = text.match(phoneRegex);

          if (emailMatch) {
            emailMatch.forEach((email) => {
              const validEmail = validateEmail(email);
              if (validEmail && !emails.includes(validEmail)) {
                emails.push(validEmail);
              }
            });
          }

          if (phoneMatch) {
            phoneMatch.forEach((phone) => {
              const validPhone = validatePhone(phone);
              if (validPhone && !phones.includes(validPhone)) {
                phones.push(validPhone);
              }
            });
          }
        });
    }

    return {
      name: name || "",
      emails: emails.slice(0, 5), // Limit to 5 emails
      phones: phones.slice(0, 5), // Limit to 5 phones
    };
  };

  if (dynamic === "yes") {
    console.log(
      `Starting dynamic scraping for ${url} with browser: ${browser}`
    );
    const browserInstance = await playwright[browser].launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browserInstance.newContext({
      userAgent: new UserAgent().toString(),
    });

    const page = await context.newPage();
    try {
      await retry(async () => {
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForSelector("body", { timeout: 10000 });
      });

      if (username && password) {
        await retry(async () => {
          const loginUrl = url.includes("linkedin.com")
            ? "https://www.linkedin.com/login"
            : url;
          await page.goto(loginUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          const emailInput = await page.$(
            'input[name="session_key"], input[type="email"], input[placeholder*="email" i], input[id*="email" i]'
          );
          const passwordInput = await page.$(
            'input[name="session_password"], input[type="password"], input[placeholder*="password" i], input[id*="password" i]'
          );
          const submitButton = await page
            .locator(
              'button[type="submit"], button[id*="sign-in" i], button:has-text("Sign in")'
            )
            .first();

          if (emailInput && passwordInput && (await submitButton.isVisible())) {
            await emailInput.type(username, { delay: 100 });
            await passwordInput.type(password, { delay: 100 });
            await submitButton.click();
            await page
              .waitForNavigation({
                waitUntil: "domcontentloaded",
                timeout: 15000,
              })
              .catch(() => {});

            if (await page.$('iframe[src*="captcha"], div[id*="captcha"]')) {
              const solved = await solveCaptcha(page);
              if (!solved) throw new Error("CAPTCHA solving failed");
              await submitButton.click();
              await page.waitForNavigation({
                waitUntil: "domcontentloaded",
                timeout: 60000,
              });
            }

            if (page.url().includes("login")) {
              throw new Error("Login failed");
            }
          }
        });

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      }

      // Scroll to load dynamic content
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

      // Check for contact info section
      try {
        const contactButton = await page
          .locator(
            'a[href*="contact" i], button[aria-label*="contact" i], a:has-text("Contact")'
          )
          .first();
        if (contactButton && (await contactButton.isVisible())) {
          await contactButton.click();
          await page
            .waitForSelector(
              ".pv-profile-section__section-info, .pv-contact-info__ci-container, [data-section='contact-info'], .contact-form",
              { timeout: 10000 }
            )
            .catch(() => {
              console.log(
                "Contact info section not found; proceeding with extraction"
              );
            });
        }
      } catch (e) {
        console.log(
          "Contact button interaction failed; proceeding with extraction"
        );
      }

      const contactData = await extractData(null, true, page);

      // Execute workflow actions
      for (const action of workflow) {
        try {
          await page.waitForTimeout(1000);
          if (action.action === "click") {
            await page.mouse.click(action.x, action.y);
          } else if (action.action === "type") {
            await page.type(action.selector, action.value);
          }
        } catch (e) {
          console.error("Workflow action failed:", e.message);
        }
      }

      // Create structured results
      const maxLength = Math.max(
        contactData.emails.length,
        contactData.phones.length,
        1
      );

      results = [];
      for (let i = 0; i < maxLength; i++) {
        const email = contactData.emails[i] || "";
        const phone = contactData.phones[i] || "";

        let resultData = {
          name: contactData.name || "",
          email: email,
          phone: phone,
          values: [contactData.name || "", email, phone],
        };

        if (enrich) {
          resultData = await enrichData(resultData);
        } else {
          resultData.enriched = {
            company: "",
            jobTitle: "",
            linkedin: "",
            emailStatus: email ? "unknown" : "",
            domain: extractDomain(email),
          };
        }

        results.push(resultData);
      }

      if (results.length === 0) {
        results.push({
          name: "",
          email: "",
          phone: "",
          values: ["", "", ""],
          enriched: {
            company: "",
            jobTitle: "",
            linkedin: "",
            emailStatus: "",
            domain: "",
          },
        });
      }

      await browserInstance.close();
    } catch (error) {
      console.error("Dynamic scraping error:", error.message);
      await browserInstance.close();
      results = [
        {
          name: "",
          email: "",
          phone: "",
          values: ["", "", ""],
          enriched: {
            company: "",
            jobTitle: "",
            linkedin: "",
            emailStatus: "",
            domain: "",
          },
          error: error.message,
        },
      ];
    }
  } else {
    try {
      console.log(`Starting static scraping for ${url}`);
      const response = await axios.get(url, { timeout: 30000 });
      const contactData = await extractData(response.data, false);

      const maxLength = Math.max(
        contactData.emails.length,
        contactData.phones.length,
        1
      );

      results = [];
      for (let i = 0; i < maxLength; i++) {
        const email = contactData.emails[i] || "";
        const phone = contactData.phones[i] || "";

        let resultData = {
          name: contactData.name || "",
          email: email,
          phone: phone,
          values: [contactData.name || "", email, phone],
        };

        if (enrich) {
          resultData = await enrichData(resultData);
        } else {
          resultData.enriched = {
            company: "",
            jobTitle: "",
            linkedin: "",
            emailStatus: email ? "unknown" : "",
            domain: extractDomain(email),
          };
        }

        results.push(resultData);
      }

      if (results.length === 0) {
        results.push({
          name: "",
          email: "",
          phone: "",
          values: ["", "", ""],
          enriched: {
            company: "",
            jobTitle: "",
            linkedin: "",
            emailStatus: "",
            domain: "",
          },
        });
      }
    } catch (error) {
      console.error("Static scraping error:", error.message);
      results = [
        {
          name: "",
          email: "",
          phone: "",
          values: ["", "", ""],
          enriched: {
            company: "",
            jobTitle: "",
            linkedin: "",
            emailStatus: "",
            domain: "",
          },
          error: error.message,
        },
      ];
    }
  }

  return { jobId, results };
};

const attachWebSocket = (server) => {
  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
};

router.post("/schedule-job", authenticateToken, async (req, res) => {
  const { jobId, url, schedule, config, workflowId } = req.body;
  if (!url || !jobId)
    return res.status(400).json({ message: "URL and jobId are required" });
  try {
    await db.collection("jobs").insertOne({
      jobId,
      url,
      schedule: {
        datetime: schedule.datetime ? new Date(schedule.datetime) : null,
        cron: schedule.cron || null,
      },
      config,
      workflowId,
      userId: req.user.userId,
      status: "pending",
      createdAt: new Date(),
    });
    res.json({ message: "Job scheduled successfully", jobId });
  } catch (error) {
    console.error("Error scheduling job:", error.message);
    res.status(500).json({
      message: "Server error during scheduling",
      details: error.message,
    });
  }
});

router.post("/scrape", authenticateToken, async (req, res) => {
  const {
    url,
    username = "",
    password = "",
    dynamic = "yes",
    workflow = [],
    jobId,
    workflowId,
    browser = "chromium",
    enrich = false,
  } = req.body;
  if (!url) return res.status(400).json({ message: "URL is required" });

  const validBrowsers = ["chromium", "firefox", "webkit"];
  if (!validBrowsers.includes(browser)) {
    console.error(`Invalid browser type received: ${browser}`);
    return res.status(400).json({
      message: `Invalid browser type: ${browser}. Must be one of ${validBrowsers.join(
        ", "
      )}`,
    });
  }

  try {
    const robotsUrl = new URL("/robots.txt", url).toString();
    const robotsResponse = await axios
      .get(robotsUrl, { timeout: 10000 })
      .catch(() => ({ data: "" }));
    if (
      robotsResponse.data.includes("Disallow: /in/") &&
      url.includes("linkedin.com/in/")
    ) {
      return res.status(403).json({
        message: "Scraping LinkedIn profiles disallowed by robots.txt",
      });
    }

    const data = await scrapePage({
      url,
      username,
      password,
      dynamic,
      workflow,
      jobId,
      workflowId,
      browser,
      enrich,
    });

    if (jobId) {
      await db
        .collection("jobs")
        .updateOne(
          { jobId, userId: req.user.userId, workflowId },
          { $set: { status: "completed", completedAt: new Date() } }
        );
    }

    res.json(data);
  } catch (error) {
    if (jobId) {
      await db.collection("jobs").updateOne(
        { jobId, userId: req.user.userId, workflowId },
        {
          $set: {
            status: "failed",
            error: error.message,
            completedAt: new Date(),
          },
        }
      );
    }
    console.error("Scrape error:", error.message);
    res.status(500).json({
      message: "Server error during scraping",
      details: error.message,
    });
  }
});

router.post("/trigger-enrichment", authenticateToken, async (req, res) => {
  const { jobId, url, workflowId } = req.body;
  if (!jobId && !url) {
    return res.status(400).json({ message: "jobId or URL is required" });
  }

  try {
    let targetUrl = url;
    if (jobId) {
      const job = await db
        .collection("jobs")
        .findOne({ jobId, userId: req.user.userId });
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      targetUrl = job.url;
    }

    const data = await scrapePage({
      url: targetUrl,
      dynamic: "yes",
      workflow: [],
      jobId: jobId || `enrich_${Date.now()}`,
      workflowId,
      browser: "chromium",
      enrich: true,
    });

    await db
      .collection("results")
      .updateOne(
        { jobId: data.jobId, userId: req.user.userId, workflowId },
        {
          $set: {
            csv: formatResultsToCsv(data.results),
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

    res.json({ message: "Enrichment triggered successfully", data });
  } catch (error) {
    console.error("Enrichment error:", error.message);
    res.status(500).json({
      message: "Server error during enrichment",
      details: error.message,
    });
  }
});

router.post("/save-results", authenticateToken, async (req, res) => {
  const { jobId, csv, workflowId } = req.body;
  if (!jobId || !csv)
    return res
      .status(400)
      .json({ message: "Job ID and CSV data are required" });
  try {
    await db
      .collection("results")
      .updateOne(
        { jobId, userId: req.user.userId, workflowId },
        { $set: { csv, createdAt: new Date() } },
        { upsert: true }
      );
    console.log(`Saved results for job ${jobId} under workflow ${workflowId}`);
    res.json({ message: "Results saved successfully" });
  } catch (error) {
    console.error("Error saving results:", error.message);
    res.status(500).json({
      message: "Server error during saving results",
      details: error.message,
    });
  }
});

router.get("/results/:jobId", authenticateToken, async (req, res) => {
  const { jobId } = req.params;
  const { workflowId } = req.query;
  try {
    const result = await db
      .collection("results")
      .findOne({ jobId, userId: req.user.userId, workflowId });
    if (!result)
      return res
        .status(404)
        .json({ message: "Results not found for this job" });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=job_${jobId}.csv`
    );
    res.send(result.csv);
  } catch (error) {
    console.error("Error retrieving results:", error.message);
    res.status(500).json({
      message: "Server error retrieving results",
      details: error.message,
    });
  }
});

router.get("/jobs", authenticateToken, async (req, res) => {
  try {
    const jobs = await db
      .collection("jobs")
      .find({ userId: req.user.userId })
      .toArray();
    const jobData = await Promise.all(
      jobs.map(async (job) => {
        const result = await db.collection("results").findOne({
          jobId: job.jobId,
          userId: req.user.userId,
          workflowId: job.workflowId,
        });
        return {
          id: job.jobId,
          url: job.url,
          datetime: job.schedule.datetime,
          recurrence: job.schedule.cron,
          status: job.status,
          results: result
            ? result.csv
                .split("\n")
                .slice(1)
                .filter((line) => line.trim())
                .map((row) => {
                  const values = row
                    .split(",")
                    .map((val) =>
                      val.replace(/^"|"$/g, "").replace(/""/g, '"')
                    );
                  return {
                    values: [values[0] || "", values[1] || "", values[2] || ""],
                    enriched: {
                      company: values[3] || "",
                      jobTitle: values[4] || "",
                      linkedin: values[5] || "",
                      emailStatus: values[6] || "unknown",
                      domain: values[7] || "",
                    },
                  };
                })
            : [],
          workflowId: job.workflowId,
        };
      })
    );
    console.log(`Fetched ${jobData.length} jobs for user ${req.user.userId}`);
    res.json(jobData);
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    res
      .status(500)
      .json({ message: "Server error fetching jobs", details: error.message });
  }
});

router.post("/save-excel", authenticateToken, async (req, res) => {
  const { jobId, workflowId, excelData } = req.body;
  const userId = req.user.userId;

  try {
    if (!jobId || !workflowId || !excelData) {
      return res.status(400).json({
        message: "Missing required fields: jobId, workflowId, or excelData",
      });
    }

    let validWorkflowId = workflowId;
    if (!ObjectId.isValid(workflowId)) {
      const workflow = await Workflow.findOne({ id: workflowId });
      if (!workflow) {
        return res.status(400).json({
          message: `Invalid workflowId: Workflow with id ${workflowId} not found`,
        });
      }
      validWorkflowId = workflow._id;
    }

    const buffer = Buffer.from(excelData, "base64");
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const result = new Result({
      jobId,
      workflowId: validWorkflowId,
      userId,
      fileName: `job_${jobId}.xlsx`,
      fileData: buffer,
      data,
    });

    await result.save();

    await User.findByIdAndUpdate(
      userId,
      { $push: { savedResults: result._id } },
      { new: true }
    );

    res.status(200).json({
      message: "Excel file saved successfully.",
      resultId: result._id,
    });
  } catch (error) {
    console.error("Error saving Excel file:", error);
    res
      .status(500)
      .json({ message: "Failed to save Excel file.", details: error.message });
  }
});

router.get("/results", authenticateToken, async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user.userId })
      .select("jobId fileName createdAt data")
      .lean();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ message: "Failed to fetch results." });
  }
});

router.get(
  "/results/:resultId/download",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await Result.findOne({
        _id: req.params.resultId,
        userId: req.user.userId,
      });

      if (!result) {
        return res
          .status(404)
          .json({ message: "Result not found or access denied." });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${result.fileName}`
      );
      res.send(result.fileData);
    } catch (error) {
      console.error("Error downloading result:", error);
      res.status(500).json({ message: "Failed to download result." });
    }
  }
);

router.delete("/cancel-job/:jobId", async (req, res) => {
  const { jobId } = req.params;

  try {
    // Step 1: Find job from DB
    const job = await db.collection("jobs").findOne({ jobId });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Step 2: Only allow canceling 'pending' jobs
    if (job.status !== "pending") {
      return res.status(400).json({
        message: "Only pending jobs can be canceled",
      });
    }

    // Step 3: Update job status to 'canceled'
    await db
      .collection("jobs")
      .updateOne(
        { jobId },
        { $set: { status: "canceled", canceledAt: new Date() } }
      );

    res.json({
      success: true,
      message: "Job canceled successfully",
    });
  } catch (error) {
    console.error("Cancel job error:", error);
    res.status(500).json({ message: "Failed to cancel job" });
  }
});



module.exports = { router, wss, attachWebSocket };
