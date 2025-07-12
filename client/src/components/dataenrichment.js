
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Chart from "chart.js/auto";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5000/scrape";

const DataEnrichment = () => {
  const token = localStorage.getItem("token");
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [config, setConfig] = useState({
    url: "",
    username: "",
    password: "",
    dynamic: "yes",
    proxyEnabled: false,
    captchaSolverEnabled: false,
    autoExtract: true,
    browser: "chromium",
    schedule: {
      datetime: "",
      recurrence: "one-time",
    },
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [results, setResults] = useState([]);
  const [scheduledRuns, setScheduledRuns] = useState([]);
  const [savedResults, setSavedResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedActions, setRecordedActions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [cleanData, setCleanData] = useState(false);
  const [enrichmentFields, setEnrichmentFields] = useState({
    Name: true,
    Email: true,
    Phone: true,
    Company: false,
    JobTitle: false,
    LinkedIn: false,
    EmailStatus: false,
    Domain: false,
  });
  const [filteredResults, setFilteredResults] = useState([]);
  const wsRef = useRef(null);
  const chartRef = useRef(null);

  const validateEmailFormat = (email) => {
    const re =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return (
      email &&
      typeof email === "string" &&
      email.trim() !== "" &&
      re.test(email.trim())
    );
  };

  const validatePhoneFormat = (phone) => {
    const re = /^\+?[\d\s()-]{7,}(?:\s*(?:ext\.?|x)\s*\d+)?$/;
    return (
      phone &&
      typeof phone === "string" &&
      phone.trim() !== "" &&
      re.test(phone.trim())
    );
  };

  const validateTextField = (value) => {
    return (
      value &&
      typeof value === "string" &&
      value.trim() !== "" &&
      value.toLowerCase() !== "n/a"
    );
  };

  const validateEmailStatus = (status) => {
    const validStatuses = ["deliverable", "undeliverable", "risky", "unknown"];
    return (
      status &&
      typeof status === "string" &&
      validStatuses.includes(status.toLowerCase())
    );
  };

  const extractDomain = (email) => {
    if (!validateEmailFormat(email)) return "";
    return email.split("@")[1]?.trim() || "";
  };

  const verifyEmailDeliverability = async (email) => {
    if (!validateEmailFormat(email)) return "invalid";
    try {
      const response = await axios.get(
        `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${process.env.REACT_APP_HUNTER_API_KEY}`
      );
      return response.data.data.status;
    } catch (err) {
      console.error("Hunter.io API error:", err);
      return "unknown";
    }
  };

  const enrichData = async (results) => {
    const enrichedResults = await Promise.all(
      results.map(async (row) => {
        const email = row.email || row.values?.[1] || "";
        const enrichedData = { ...row };
        const isValidEmail = validateEmailFormat(email);

        const domain = isValidEmail ? extractDomain(email) : "";
        const emailStatus = isValidEmail
          ? await verifyEmailDeliverability(email)
          : "unknown";

        if (!enrichedData.enriched) {
          enrichedData.enriched = {};
        }

        enrichedData.enriched = {
          ...enrichedData.enriched,
          emailStatus,
          domain,
          company: enrichedData.enriched?.company || "",
          jobTitle: enrichedData.enriched?.jobTitle || "",
          linkedin: enrichedData.enriched?.linkedin || "",
        };

        if (isValidEmail && emailStatus === "deliverable") {
          try {
            const response = await axios.get(
              `https://person.clearbit.com/v2/combined/find?email=${email}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.REACT_APP_CLEARBIT_API_KEY}`,
                },
              }
            );
            const { person, company } = response.data;
            enrichedData.enriched.company = validateTextField(company?.name)
              ? company.name
              : enrichedData.enriched.company;
            enrichedData.enriched.jobTitle = validateTextField(
              person?.employment?.title
            )
              ? person.employment.title
              : enrichedData.enriched.jobTitle;
            enrichedData.enriched.linkedin = validateTextField(
              person?.linkedin?.handle
            )
              ? person.linkedin.handle
              : enrichedData.enriched.linkedin;
          } catch (err) {
            console.error("Clearbit API error:", err);
          }
        }

        return enrichedData;
      })
    );
    return enrichedResults;
  };

  const sortByEmailValidity = (data) => {
    return [...data].sort((a, b) => {
      const aEmail = a.email || a.values?.[1] || "";
      const bEmail = b.email || b.values?.[1] || "";
      const aEmailValid = validateEmailFormat(aEmail);
      const bEmailValid = validateEmailFormat(bEmail);
      return aEmailValid === bEmailValid ? 0 : aEmailValid ? -1 : 1;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (workflowId) {
          const workflowResponse = await axios.get(
            `${BASE_URL}/workflows/${workflowId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setWorkflowTitle(workflowResponse.data.title || "Untitled Workflow");
        }

        const jobsResponse = await axios.get(`${BASE_URL}/scrape/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setScheduledRuns(
          jobsResponse.data.filter((job) => job.workflowId === workflowId)
        );

        const resultsResponse = await axios.get(`${BASE_URL}/scrape/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedResults(resultsResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch data.");
      }
    };
    if (token) {
      fetchData();
    }
  }, [token, workflowId]);

  useEffect(() => {
    if (isRecording && config.url && wsRef.current === null) {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            action: "start-recording",
            url: config.url,
            browser: config.browser,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.message === "Recording started") {
          setSessionId(data.sessionId);
        } else if (data.error) {
          setError(data.error);
          ws.close();
        } else if (data.action) {
          setRecordedActions((prev) => [
            ...prev,
            { ...data, timestamp: data.timestamp || Date.now() },
          ]);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (isRecording) {
          setError("WebSocket connection lost.");
          setIsRecording(false);
        }
      };

      ws.onerror = () => {
        setError("WebSocket error.");
      };
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [isRecording, config.url, config.browser]);

  useEffect(() => {
    if (results.length > 0 && chartRef.current) {
      const ctx = chartRef.current.getContext("2d");
      if (chartRef.current.chart) chartRef.current.chart.destroy();

      const emailCount = results.filter((row) => {
        const email = row.email || row.values?.[1] || "";
        return validateEmailFormat(email);
      }).length;

      const phoneCount = results.filter((row) => {
        const phone = row.phone || row.values?.[2] || "";
        return validatePhoneFormat(phone);
      }).length;

      const deliverableEmailCount = results.filter(
        (row) => row.enriched?.emailStatus === "deliverable"
      ).length;

      chartRef.current.chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Emails", "Phones", "Deliverable Emails"],
          datasets: [
            {
              label: "Contact Info",
              data: [emailCount, phoneCount, deliverableEmailCount],
              backgroundColor: "#4CAF50",
            },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });
    }
  }, [results]);

  useEffect(() => {
    let updatedResults = [...results];
    if (!Object.values(enrichmentFields).some((field) => field)) {
      updatedResults = cleanData
        ? results.filter((row) => row.enriched?.emailStatus === "deliverable")
        : results;
    } else {
      const selectedFields = Object.keys(enrichmentFields).filter(
        (field) => enrichmentFields[field]
      );

      updatedResults = results.filter((row) => {
        if (cleanData && row.enriched?.emailStatus !== "deliverable")
          return false;

        return selectedFields.some((field) => {
          let value = "";
          switch (field) {
            case "Name":
              value = row.name || row.values?.[0] || "";
              return validateTextField(value);
            case "Email":
              value = row.email || row.values?.[1] || "";
              return validateEmailFormat(value);
            case "Phone":
              value = row.phone || row.values?.[2] || "";
              return validatePhoneFormat(value);
            case "Company":
              value = row.enriched?.company || "";
              return validateTextField(value);
            case "JobTitle":
              value = row.enriched?.jobTitle || "";
              return validateTextField(value);
            case "LinkedIn":
              value = row.enriched?.linkedin || "";
              return validateTextField(value);
            case "EmailStatus":
              value = row.enriched?.emailStatus || "";
              return validateEmailStatus(value);
            case "Domain":
              value = row.enriched?.domain || "";
              return validateTextField(value);
            default:
              return false;
          }
        });
      });
    }

    setFilteredResults(sortByEmailValidity(updatedResults));
  }, [enrichmentFields, results, cleanData]);

  if (!token) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mx-auto max-w-2xl mt-5 text-center">
        Please sign in to access Data Enrichment.
      </div>
    );
  }

  const startRecording = () => {
    setIsRecording(true);
    setRecordedActions([]);
    setError("");
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (wsRef.current) {
      wsRef.current.close();
      setSessionId(null);
    }
  };

  const handleSubmit = async () => {
    if (loading || !config.url) {
      setError("Please provide a valid URL.");
      return;
    }
    if (
      config.schedule.datetime &&
      new Date(config.schedule.datetime).toISOString() < new Date().toISOString()
    ) {
      setError("Scheduled time must be in the future.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const jobId = uuidv4();
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("token");
      if (!userId || !token) {
        setError("User not authenticated. Please log in.");
        return;
      }
      const creditsToDeduct = 99;
      const description = config.schedule.datetime
        ? "Scheduled scraper run"
        : "Immediate scraper run";

      const creditResponse = await axios.post(
        `${BASE_URL}/api/billing/deduct-credits`,
        { userId, jobId, credits: creditsToDeduct, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!creditResponse.data.success) {
        setError("Failed to deduct credits. Please try again.");
        return;
      }

      setSuccess(
        `${creditsToDeduct} credits deducted for ${description.toLowerCase()}.`
      );
      setTimeout(() => setSuccess(""), 5000);

      if (config.schedule.datetime) {
        const scheduleDate = new Date(config.schedule.datetime);
        console.log("Scheduling job with datetime:", scheduleDate.toISOString());
        const newRun = {
          id: jobId,
          url: config.url,
          datetime: scheduleDate.toISOString(),
          recurrence: config.schedule.recurrence,
          status: "pending",
          config: { ...config, workflow: recordedActions },
          results: [],
          workflowId,
        };
        setScheduledRuns((prev) => [...prev, newRun]);
        try {
          const response = await axios.post(
            `${BASE_URL}/scrape/schedule-job`,
            {
              jobId,
              url: config.url,
              schedule: {
                datetime: scheduleDate.toISOString(),
                recurrence: config.schedule.recurrence,
              },
              config: { ...config, workflow: recordedActions },
              workflowId,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Schedule job response:", response.data);
          setSuccess("Job scheduled successfully.");
          setTimeout(() => setSuccess(""), 5000);
          setConfig({
            ...config,
            url: "",
            username: "",
            password: "",
            schedule: { datetime: "", recurrence: "one-time" },
            browser: "chromium",
          });
        } catch (err) {
          console.error("Schedule job error:", err);
          setError(
            err.response?.data?.message || "Failed to schedule the job."
          );
          setScheduledRuns((prev) => prev.filter((run) => run.id !== jobId));
        }
      } else {
        const response = await axios.post(
          `${BASE_URL}/scrape/scrape`,
          {
            ...config,
            workflow: recordedActions,
            jobId,
            workflowId,
            browser: "chromium",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("Scrape response:", response.data);

        if (response.data.results && Array.isArray(response.data.results)) {
          const enrichedResults = await enrichData(response.data.results);
          const sortedResults = sortByEmailValidity(enrichedResults);
          setResults(sortedResults);
          setFilteredResults(sortedResults);
          setShowEnrichment(true);
        } else {
          setError("No valid results returned from scraping.");
        }
      }
    } catch (err) {
      console.error("Submit error:", err);
      const errorMessage = err.response?.data?.message;
      if (errorMessage === "Insufficient credits") {
        setError("You do not have enough credits to perform this action.");
      } else {
        setError(
          errorMessage || "Failed to schedule, run scraper, or deduct credits."
        );
      }
    }
    setLoading(false);
  };

  const handleCancel = async (jobId) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await axios.delete(
        `${BASE_URL}/scrape/cancel-job/${jobId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Cancel job response:", response.data);
      setScheduledRuns((prev) =>
        prev.map((run) =>
          run.id === jobId ? { ...run, status: "canceled" } : run
        )
      );
      setSuccess("Job canceled successfully.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("Cancel job error:", err);
      setError(err.response?.data?.message || "Failed to cancel the job.");
    }
    setLoading(false);
  };

  const handleExport = async (jobId, results = []) => {
    let exportResults = results;
    if (!exportResults.length) {
      try {
        const response = await axios.get(
          `${BASE_URL}/scrape/results/${jobId}?workflowId=${workflowId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const lines = response.data
          .split("\n")
          .slice(1)
          .filter((line) => line.trim() !== "");
        exportResults = lines.map((line) => {
          const values = line
            .split(",")
            .map((val) => val.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
          return {
            name: values[0] || "",
            email: values[1] || "",
            phone: values[2] || "",
            values: [values[0] || "", values[1] || "", values[2] || ""],
            enriched: {
              company: values[3] || "",
              jobTitle: values[4] || "",
              linkedin: values[5] || "",
              emailStatus: values[6] || "unknown",
              domain: values[7] || "",
            },
          };
        });
      } catch (err) {
        console.error("Export error:", err);
        setError(
          err.response?.data?.message || "Failed to fetch results for export."
        );
        return;
      }
    }
    if (!exportResults.length) {
      setError("No results to export.");
      return;
    }

    exportResults = sortByEmailValidity(exportResults);
    const csv = exportResults
      .map((row) =>
        [
          row.name || row.values?.[0] || "",
          row.email || row.values?.[1] || "",
          row.phone || row.values?.[2] || "",
          row.enriched?.company || "",
          row.enriched?.jobTitle || "",
          row.enriched?.linkedin || "",
          row.enriched?.emailStatus || "",
          row.enriched?.domain || "",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob(
      [`Name,Email,Phone,Company,JobTitle,LinkedIn,EmailStatus,Domain\n${csv}`],
      {
        type: "text/csv",
      }
    );
    saveAs(blob, `job_${jobId}.csv`);
  };

  const handleSaveToDatabase = async () => {
    if (!results.length) {
      setError("No results to save.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const exportResults = sortByEmailValidity(results);
      const data = exportResults.map((row) => ({
        Name: row.name || row.values?.[0] || "",
        Email: row.email || row.values?.[1] || "",
        Phone: row.phone || row.values?.[2] || "",
        Company: row.enriched?.company || "",
        JobTitle: row.enriched?.jobTitle || "",
        LinkedIn: row.enriched?.linkedin || "",
        EmailStatus: row.enriched?.emailStatus || "unknown",
        Domain: row.enriched?.domain || "",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Results");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      const arrayBuffer = new Uint8Array(excelBuffer);
      const binaryString = Array.from(arrayBuffer)
        .map((byte) => String.fromCharCode(byte))
        .join("");
      const base64Excel = btoa(binaryString);

      const jobId = uuidv4();
      const response = await axios.post(
        `${BASE_URL}/scrape/save-excel`,
        { jobId, workflowId, excelData: base64Excel },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSavedResults((prev) => [
        ...prev,
        {
          _id: response.data.resultId,
          jobId,
          fileName: `job_${jobId}.xlsx`,
          createdAt: new Date(),
          data: data,
        },
      ]);

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `job_${jobId}.xlsx`);

      setSuccess("Results successfully saved to database and downloaded locally.");
      setSaveSuccess(true);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      console.error("Save to database error:", err);
      setError(
        err.response?.data?.message || "Failed to save results to database."
      );
    }
    setLoading(false);
  };

  const handleDownloadResult = async (resultId, fileName) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/scrape/results/${resultId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, fileName);
    } catch (err) {
      console.error("Download result error:", err);
      setError(err.response?.data?.message || "Failed to download result.");
    }
  };

  const handleCheckboxChange = (field) => {
    setEnrichmentFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleNextProcess = (resultId, jobId, fileName) => {
    navigate("/next-process", { state: { resultId, jobId, fileName } });
  };

  const getFieldValue = (row, field) => {
    switch (field) {
      case "Name":
        return row.name || row.values?.[0] || "";
      case "Email":
        return row.email || row.values?.[1] || "";
      case "Phone":
        return row.phone || row.values?.[2] || "";
      case "Company":
        return row.enriched?.company || "";
      case "JobTitle":
        return row.enriched?.jobTitle || "";
      case "LinkedIn":
        return row.enriched?.linkedin || "";
      case "EmailStatus":
        return row.enriched?.emailStatus || "";
      case "Domain":
        return row.enriched?.domain || "";
      default:
        return "";
    }
  };

  const isValidValue = (value, field) => {
    switch (field) {
      case "Email":
        return validateEmailFormat(value);
      case "Phone":
        return validatePhoneFormat(value);
      case "EmailStatus":
        return validateEmailStatus(value);
      default:
        return validateTextField(value);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Data Enrichment {workflowTitle ? `for ${workflowTitle}` : ""}
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target URL
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://www.url.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Target URL"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) =>
                  setConfig({ ...config, username: e.target.value })
                }
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) =>
                  setConfig({ ...config, password: e.target.value })
                }
                placeholder="your.password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="Password"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule
            </label>
            <input
              type="datetime-local"
              value={config.schedule.datetime}
              onChange={(e) =>
                setConfig({
                  ...config,
                  schedule: { ...config.schedule, datetime: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Schedule Date and Time"
            />
            <select
              value={config.schedule.recurrence}
              onChange={(e) =>
                setConfig({
                  ...config,
                  schedule: { ...config.schedule, recurrence: e.target.value },
                })
              }
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Schedule Recurrence"
            >
              <option value="one-time">One-time</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Browser
            </label>
            <select
              value={config.browser}
              onChange={(e) =>
                setConfig({ ...config, browser: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Browser Selection"
            >
              <option value="chromium">Chromium</option>
              <option value="firefox">Firefox</option>
              <option value="webkit">WebKit</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading
                ? "Processing..."
                : config.schedule.datetime
                ? "Schedule Run"
                : "Run Scraper"}
            </button>
            <button
              onClick={() => handleExport("immediate", results)}
              disabled={!results.length || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
            <button
              onClick={handleSaveToDatabase}
              disabled={!results.length || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              Save to Database
            </button>
            <button
              onClick={startRecording}
              disabled={isRecording || loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:bg-yellow-300 disabled:cursor-not-allowed"
            >
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={!isRecording || loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              Stop Recording
            </button>
          </div>
        </div>
        {recordedActions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Recorded Actions
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              {recordedActions.map((action, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {action.action} at ({action.x}, {action.y}) on{" "}
                  {action.selector} at{" "}
                  {new Date(action.timestamp).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          </div>
        )}
        {showEnrichment && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Select Fields to Display
            </h2>
            <div className="flex flex-wrap gap-4 mb-4">
              {[
                "Name",
                "Email",
                "Phone",
                "Company",
                "JobTitle",
                "LinkedIn",
                "EmailStatus",
                "Domain",
              ].map((field) => (
                <label key={field} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enrichmentFields[field]}
                    onChange={() => handleCheckboxChange(field)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{field}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={cleanData}
                onChange={() => setCleanData(!cleanData)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Show only deliverable emails
              </span>
            </label>
          </div>
        )}
        {(error || success) && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              success
                ? "bg-green-100 border border-green-400 text-green-700"
                : "bg-red-100 border border-red-400 text-red-700"
            }`}
          >
            {success || error}
          </div>
        )}

{(results.length > 0 || filteredResults.length > 0) && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Results (
              {(filteredResults.length > 0 ? filteredResults : results).length}{" "}
              records)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    {Object.values(enrichmentFields).some((field) => field) ? (
                      Object.keys(enrichmentFields)
                        .filter((field) => enrichmentFields[field])
                        .map((field) => (
                          <th
                            key={field}
                            className="border border-gray-300 p-2 text-sm sm:text-base"
                          >
                            {field}
                          </th>
                        ))
                    ) : (
                      <>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          Name
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          Email
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          Phone
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          Company
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          JobTitle
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          LinkedIn
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          EmailStatus
                        </th>
                        <th className="border border-gray-300 p-2 text-sm sm:text-base">
                          Domain
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(filteredResults.length > 0 ? filteredResults : results).map(
                    (row, index) => (
                      <tr key={index}>
                        {Object.values(enrichmentFields).some(
                          (field) => field
                        ) ? (
                          Object.keys(enrichmentFields)
                            .filter((field) => enrichmentFields[field])
                            .map((field) => {
                              const value = getFieldValue(row, field);
                              const isValid = isValidValue(value, field);

                              return (
                                <td
                                  key={field}
                                  className="border border-gray-300 p-2 text-sm sm:text-base"
                                >
                                  {value === undefined ||
                                  value === null ||
                                  value === "" ? (
                                    <span className="text-gray-400 italic">
                                      N/A
                                    </span>
                                  ) : isValid ? (
                                    <span className="text-green-600">
                                      {value}
                                    </span>
                                  ) : (
                                    <span className="text-red-500">
                                      {value} (Invalid)
                                    </span>
                                  )}
                                </td>
                              );
                            })
                        ) : (
                          <>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {getFieldValue(row, "Name") || (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateEmailFormat(
                                getFieldValue(row, "Email")
                              ) ? (
                                <span className="text-green-600">
                                  {getFieldValue(row, "Email")}
                                </span>
                              ) : getFieldValue(row, "Email") ? (
                                <span className="text-red-500">
                                  {getFieldValue(row, "Email")} (Invalid)
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validatePhoneFormat(
                                getFieldValue(row, "Phone")
                              ) ? (
                                <span className="text-green-600">
                                  {getFieldValue(row, "Phone")}
                                </span>
                              ) : getFieldValue(row, "Phone") ? (
                                <span className="text-red-500">
                                  {getFieldValue(row, "Phone")} (Invalid)
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {getFieldValue(row, "Company") || (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {getFieldValue(row, "JobTitle") || (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {getFieldValue(row, "LinkedIn") || (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateEmailStatus(
                                getFieldValue(row, "EmailStatus")
                              ) ? (
                                <span className="text-green-600">
                                  {getFieldValue(row, "EmailStatus")}
                                </span>
                              ) : getFieldValue(row, "EmailStatus") ? (
                                <span className="text-red-500">
                                  {getFieldValue(row, "EmailStatus")} (Invalid)
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {getFieldValue(row, "Domain") || (
                                <span className="text-gray-400 italic">
                                  N/A
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {scheduledRuns.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Scheduled Runs
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Job ID
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      URL
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Scheduled Time
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Recurrence
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Status
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {run.id.slice(0, 8)}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {run.url}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {new Date(run.datetime).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {run.recurrence}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {run.status}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancel(run.id)}
                            disabled={run.status !== "pending" || loading}
                            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto"
                            aria-label={`Cancel job ${run.id.slice(0, 8)}`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              handleExport(run.id, run.results || [])
                            }
                            disabled={
                              run.status !== "completed" ||
                              loading ||
                              !run.results?.length
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto"
                            aria-label={`Export results for job ${run.id.slice(
                              0,
                              8
                            )}`}
                          >
                            Export
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      

        {savedResults.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Saved Results
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Job ID
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      File Name
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Created At
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Records
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Actions
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Export
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {savedResults.map((result) => (
                    <tr key={result._id}>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {result.jobId.slice(0, 8)}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {result.fileName}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {new Date(result.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm sm:text-base">
                        {result.data ? result.data.length : 0} records
                      </td>
                      <td className="border border-gray-300 p-2">
                        <button
                          onClick={() =>
                            handleDownloadResult(result._id, result.fileName)
                          }
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          Download
                        </button>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <button
                          onClick={() =>
                            handleNextProcess(
                              result._id,
                              result.jobId,
                              result.fileName
                            )
                          }
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          Proceed to Next Process
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataEnrichment;