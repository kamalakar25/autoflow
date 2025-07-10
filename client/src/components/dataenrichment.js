import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Chart from "chart.js/auto"; // Import Chart.js
import "./DataEnrichment.css";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:5000/scrape";

const DataEnrichment = () => {
  const token = localStorage.getItem("token");
  const { workflowId } = useParams();
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
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [scheduledRuns, setScheduledRuns] = useState([]);
  const [savedResults, setSavedResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedActions, setRecordedActions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [cleanData, setCleanData] = useState(false);
  const [enrichmentFields, setEnrichmentFields] = useState({
    Name: false,
    Email: false,
    Phone: false,
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
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      email && typeof email === "string" && re.test(email) && email !== "N/A"
    );
  };

  const validatePhoneFormat = (phone) => {
    const re = /^\+?[\d\s()-]{7,}$/;
    return (
      phone && typeof phone === "string" && phone !== "N/A" && re.test(phone)
    );
  };

  const validateTextField = (value) => {
    return (
      value &&
      typeof value === "string" &&
      value !== "N/A" &&
      value.trim() !== ""
    );
  };

  const validateEmailStatus = (status) => {
    return (
      status &&
      typeof status === "string" &&
      status !== "invalid" &&
      status !== "unknown"
    );
  };

  const extractDomain = (email) => {
    if (!validateEmailFormat(email)) return "Invalid";
    return email.split("@")[1] || "Invalid";
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
        const email = row.values[1];
        let enrichedData = { ...row, enriched: {} };
        const isValidEmail = validateEmailFormat(email);

        const domain = extractDomain(email);
        const emailStatus = isValidEmail
          ? await verifyEmailDeliverability(email)
          : "invalid";

        enrichedData.enriched = {
          company: "Invalid",
          jobTitle: "Invalid",
          linkedin: "Invalid",
          emailStatus,
          domain,
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
              : "Invalid";
            enrichedData.enriched.jobTitle = validateTextField(
              person?.employment?.title
            )
              ? person.employment.title
              : "Invalid";
            enrichedData.enriched.linkedin = validateTextField(
              person?.linkedin?.handle
            )
              ? person.linkedin.handle
              : "Invalid";
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
      const aEmailValid = validateEmailFormat(a.values[1]);
      const bEmailValid = validateEmailFormat(b.values[1]);
      return aEmailValid === bEmailValid ? 0 : aEmailValid ? 1 : -1;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (workflowId) {
          const workflowResponse = await axios.get(
            `${BASE_URL}/workflows/${workflowId}`,
            { headers: { Authorization: `Bearer ${token}` } }
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
      const emailCount = results.filter(
        (row) => row.values[1] !== "N/A"
      ).length;
      const phoneCount = results.filter(
        (row) => row.values[2] !== "N/A"
      ).length;
      const deliverableEmailCount = results.filter(
        (row) => row.enriched.emailStatus === "deliverable"
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
        ? results.filter((row) => row.enriched.emailStatus === "deliverable")
        : results;
    } else {
      const selectedIndices = Object.keys(enrichmentFields)
        .filter((field) => enrichmentFields[field])
        .map(
          (field) =>
            ({
              Name: 0,
              Email: 1,
              Phone: 2,
              Company: "company",
              JobTitle: "jobTitle",
              LinkedIn: "linkedin",
              EmailStatus: "emailStatus",
              Domain: "domain",
            }[field])
        );

      updatedResults = results.filter((row) => {
        if (cleanData && row.enriched.emailStatus !== "deliverable")
          return false;
        return selectedIndices.some((index) =>
          typeof index === "number"
            ? validateTextField(row.values[index]) ||
              validateEmailFormat(row.values[index]) ||
              validatePhoneFormat(row.values[index])
            : validateTextField(row.enriched[index]) ||
              validateEmailStatus(row.enriched[index])
        );
      });
    }

    setFilteredResults(sortByEmailValidity(updatedResults));
  }, [enrichmentFields, results, cleanData]);

  if (!token) {
    return (
      <div className="alert alert-danger mt-5 text-center">
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
      new Date(config.schedule.datetime) < new Date()
    ) {
      setError("Scheduled time must be in the future.");
      return;
    }
    setLoading(true);
    setError("");

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

      setError(
        `${creditsToDeduct} credits deducted for ${description.toLowerCase()}. Wait till the scraping done!!`
      );
      setTimeout(() => setError(""), 5000);

      if (config.schedule.datetime) {
        const newRun = {
          id: jobId,
          url: config.url,
          datetime: config.schedule.datetime,
          recurrence: config.schedule.recurrence,
          status: "pending",
          config: { ...config, workflow: recordedActions },
          results: [],
          workflowId,
        };
        setScheduledRuns((prev) => [...prev, newRun]);
        await axios.post(
          `${BASE_URL}/scrape/schedule-job`,
          {
            jobId,
            url: config.url,
            schedule: config.schedule,
            config: { ...config, workflow: recordedActions },
            workflowId,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setConfig({
          ...config,
          url: "",
          username: "",
          password: "",
          schedule: { datetime: "", recurrence: "one-time" },
          browser: "chromium",
        });
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
        const enrichedResults = await enrichData(response.data.results);
        setResults(sortByEmailValidity(enrichedResults));
        setFilteredResults(sortByEmailValidity(enrichedResults));
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
          const values = line.split(",").map((val) => val.trim());
          return {
            values: [values[0] || "", values[1] || "", values[2] || ""],
            enriched: {
              company: values[3] || "Invalid",
              jobTitle: values[4] || "Invalid",
              linkedin: values[5] || "Invalid",
              emailStatus: values[6] || "unknown",
              domain: values[7] || "Invalid",
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
          validateTextField(row.values[0]) ? row.values[0] : "Invalid",
          validateEmailFormat(row.values[1])
            ? row.values[1]
            : `[${row.values[1] || "N/A"}] (Invalid)`,
          validatePhoneFormat(row.values[2]) ? row.values[2] : "Invalid",
          validateTextField(row.enriched.company)
            ? row.enriched.company
            : "Invalid",
          validateTextField(row.enriched.jobTitle)
            ? row.enriched.jobTitle
            : "Invalid",
          validateTextField(row.enriched.linkedin)
            ? row.enriched.linkedin
            : "Invalid",
          validateEmailStatus(row.enriched.emailStatus)
            ? row.enriched.emailStatus
            : "Invalid",
          validateTextField(row.enriched.domain)
            ? row.enriched.domain
            : "Invalid",
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

    try {
      const exportResults = sortByEmailValidity(results);
      const data = exportResults.map((row) => ({
        Name: validateTextField(row.values[0]) ? row.values[0] : "Invalid",
        Email: validateEmailFormat(row.values[1])
          ? row.values[1]
          : `[${row.values[1] || "N/A"}] (Invalid)`,
        Phone: validatePhoneFormat(row.values[2]) ? row.values[2] : "Invalid",
        Company: validateTextField(row.enriched.company)
          ? row.enriched.company
          : "Invalid",
        JobTitle: validateTextField(row.enriched.jobTitle)
          ? row.enriched.jobTitle
          : "Invalid",
        LinkedIn: validateTextField(row.enriched.linkedin)
          ? row.enriched.linkedin
          : "Invalid",
        EmailStatus: validateEmailStatus(row.enriched.emailStatus)
          ? row.enriched.emailStatus
          : "Invalid",
        Domain: validateTextField(row.enriched.domain)
          ? row.enriched.domain
          : "Invalid",
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
        },
      ]);

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `job_${jobId}.xlsx`);

      setError(
        "Results successfully saved to database and downloaded locally."
      );
      setSaveSuccess(true);
      setTimeout(() => setError(""), 5000);
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

  const fieldMap = {
    Name: { type: "values", index: 0 },
    Email: { type: "values", index: 1 },
    Phone: { type: "values", index: 2 },
    Company: { type: "enriched", key: "company" },
    JobTitle: { type: "enriched", key: "jobTitle" },
    LinkedIn: { type: "enriched", key: "linkedin" },
    EmailStatus: { type: "enriched", key: "emailStatus" },
    Domain: { type: "enriched", key: "domain" },
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Data Enrichment {workflowTitle ? `for ${workflowTitle}` : ""}
      </h1>
      <div className="card bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Target URL
          </label>
          <input
            type="text"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://www.url.com"
            className="input border p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) =>
                setConfig({ ...config, username: e.target.value })
              }
              placeholder="your.email@example.com"
              className="input border p-2 w-full rounded-md focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={config.password}
              onChange={(e) =>
                setConfig({ ...config, password: e.target.value })
              }
              placeholder="Password"
              className="input border p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {/* <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Browser
          </label>
          <select
            value={config.browser}
            onChange={(e) => setConfig({ ...config, browser: e.target.value })}
            className="input border p-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="chromium">Chromium</option>
            <option value="firefox">Firefox</option>
            <option value="webkit">WebKit</option>
          </select>
        </div> */}
        {/* <div className="flex gap-2 mb-4">
          <button
            onClick={startRecording}
            disabled={isRecording || loading}
            className="btn bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 mt-3"
          >
            Start Recording
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording || loading}
            className="btn bg-red-500 text-white p-2 rounded-md hover:bg-red-600 disabled:bg-red-300 mt-3"
          >
            Stop Recording
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 mt-3"
          >
            {loading
              ? "Scraping..."
              : config.schedule.datetime
              ? "Schedule Run"
              : "Run Scraper"}
          </button>
          <button
            onClick={() => handleExport("immediate", results)}
            disabled={!results.length || loading}
            className="btn bg-green-500 text-white p-2 rounded-md hover:bg-green-600 disabled:bg-green-300 mt-3"
          >
            Export CSV
          </button>
          <button
            onClick={handleSaveToDatabase}
            disabled={!results.length || loading}
            className="btn bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 mt-3"
          >
            Save to Database
          </button>
          <button
            onClick={() => setShowEnrichment(!showEnrichment)}
            disabled={loading}
            className="btn bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 mt-3"
          >
            {showEnrichment ? "Hide Enrichment" : "Add Enrichment"}
          </button>
        </div> */}
        {recordedActions.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Recorded Actions
            </h2>
            <ul className="list-disc pl-5">
              {recordedActions.map((action, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {action.action} at ({action.x}, {action.y}) on{" "}
                  {action.selector} at{" "}
                  {new Date(action.timestamp).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          </div>
        )}
        {showEnrichment && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Fields to Display
            </label>
            <div className="flex gap-4 mb-2 flex-wrap">
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
                <label key={field} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enrichmentFields[field]}
                    onChange={() => handleCheckboxChange(field)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{field}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={cleanData}
                onChange={() => setCleanData(!cleanData)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">
                Show only deliverable emails
              </span>
            </label>
          </div>
        )}
        {error && (
          <p
            className={`mt-4 text-center p-2 rounded-md ${
              error.includes("credits deducted") ||
              error.includes("successfully")
                ? "bg-green-500 text-white"
                : "text-red-500 border border-red-500"
            }`}
          >
            {error}
          </p>
        )}
        {savedResults.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Saved Results
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 mt-2 min-w-[640px] sm:min-w-0">
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
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {result.jobId.slice(0, 8)}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {result.fileName}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {new Date(result.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2">
                        <button
                          onClick={() =>
                            handleDownloadResult(result._id, result.fileName)
                          }
                          className="btn bg-green-500 text-white p-1 rounded-md hover:bg-green-600 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          Download
                        </button>
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2">
                        <button
                          onClick={() =>
                            handleNextProcess(
                              result._id,
                              result.jobId,
                              result.fileName
                            )
                          }
                          className="btn bg-blue-500 text-white p-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm w-full sm:w-auto"
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
        {scheduledRuns.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Scheduled Runs
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 mt-2 min-w-[640px] sm:min-w-0">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Job ID
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      URL
                    </th>
                    <th className="border border-gray-300 p-2 text-sm sm:text-base">
                      Date & Time
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
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {run.id.slice(0, 8)}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {run.url}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {new Date(run.datetime).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {run.recurrence}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2 text-sm sm:text-base">
                        {run.status}
                      </td>
                      <td className="border border-gray-300 p-1 sm:p-2">
                        {run.status === "completed" && (
                          <button
                            onClick={() => handleExport(run.id, run.results)}
                            className="btn bg-green-500 text-white p-1 rounded-md hover:bg-green-600 text-xs sm:text-sm w-full sm:w-auto"
                          >
                            Export
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {(results.length > 0 || filteredResults.length > 0) && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Results
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 mt-2 min-w-[640px] sm:min-w-0">
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
                              const mapping = fieldMap[field];
                              const value =
                                mapping.type === "values"
                                  ? row.values[mapping.index]
                                  : row.enriched[mapping.key];
                              const isValid =
                                (field === "Email" &&
                                  validateEmailFormat(value)) ||
                                (field === "Phone" &&
                                  validatePhoneFormat(value)) ||
                                (field === "EmailStatus" &&
                                  validateEmailStatus(value)) ||
                                validateTextField(value);

                              return (
                                <td
                                  key={field}
                                  className="border border-gray-300 p-2 text-sm sm:text-base"
                                >
                                  {field === "Email" && !isValid ? (
                                    <span className="invalid">{`[${
                                      value || "N/A"
                                    }] (Invalid)`}</span>
                                  ) : isValid ? (
                                    value
                                  ) : (
                                    <span className="invalid">Invalid</span>
                                  )}
                                </td>
                              );
                            })
                        ) : (
                          <>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateTextField(row.values[0]) ? (
                                row.values[0]
                              ) : (
                                <span className="invalid">Invalid</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateEmailFormat(row.values[1]) ? (
                                row.values[1]
                              ) : (
                                <span className="invalid">{`[${
                                  row.values[1] || "N/A"
                                }] (Invalid)`}</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validatePhoneFormat(row.values[2]) ? (
                                row.values[2]
                              ) : (
                                <span className="invalid">Invalid</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateTextField(row.enriched.company) ? (
                                row.enriched.company
                              ) : (
                                <span className="invalid">Invalid</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateTextField(row.enriched.jobTitle) ? (
                                row.enriched.jobTitle
                              ) : (
                                <span className="invalid">Invalid</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateTextField(row.enriched.linkedin) ? (
                                row.enriched.linkedin
                              ) : (
                                <span className="invalid">Invalid</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateEmailStatus(row.enriched.emailStatus) ? (
                                row.enriched.emailStatus
                              ) : (
                                <span className="invalid">Invalid</span>
                              )}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm sm:text-base">
                              {validateTextField(row.enriched.domain) ? (
                                row.enriched.domain
                              ) : (
                                <span className="invalid">Invalid</span>
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
      </div>
    </div>
  );
};

export default DataEnrichment;
