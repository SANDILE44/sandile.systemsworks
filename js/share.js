const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const contentEl = document.getElementById("content");
const titleEl = document.getElementById("title");

const formatNum = (value) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const percent = (value) => `${formatNum(value)}%`;

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

const labelFor = (key) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

function addShareStyles() {
  const style = document.createElement("style");
  style.textContent = `
    body {
      box-sizing: border-box;
      padding: 1.5rem 0;
      background:
        radial-gradient(ellipse at 12% 5%, rgba(0, 180, 216, .14), transparent 38%),
        radial-gradient(ellipse at 90% 90%, rgba(99, 102, 241, .14), transparent 36%),
        linear-gradient(145deg, #071226, #020617 60%, #09152a);
    }
    .report-container {
      box-sizing: border-box;
      width: min(92%, 780px);
      max-width: 780px;
      padding: clamp(1.25rem, 4vw, 2.75rem);
      background: linear-gradient(155deg, rgba(12, 27, 49, .98), rgba(4, 11, 27, .99));
      border-color: rgba(148, 163, 184, .17);
      box-shadow: 0 30px 90px rgba(0, 0, 0, .42), 0 0 70px rgba(0, 180, 216, .06);
    }
    .report-container > header {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
    }
    .report-container h1 {
      font-size: clamp(1.55rem, 4vw, 2.25rem);
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .share-report { display: grid; gap: 1.25rem; }
    .report-kicker {
      margin: 0 0 .8rem;
      color: #67e8f9;
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .13em;
      text-transform: uppercase;
    }
    .share-hero {
      position: relative;
      overflow: hidden;
      padding: clamp(1.25rem, 4vw, 2rem);
      border: 1px solid rgba(103, 232, 249, .2);
      border-radius: 20px;
      background: linear-gradient(120deg, rgba(8, 145, 178, .16), rgba(30, 41, 59, .55) 55%, rgba(99, 102, 241, .12));
    }
    .share-hero:after {
      position: absolute;
      top: -70px;
      right: -50px;
      width: 190px;
      height: 190px;
      border: 1px solid rgba(103, 232, 249, .11);
      border-radius: 50%;
      box-shadow: 0 0 0 22px rgba(103, 232, 249, .025), 0 0 0 46px rgba(103, 232, 249, .02);
      content: "";
      pointer-events: none;
    }
    .share-profit-label {
      margin: 0 0 .35rem;
      color: #a5b4c8;
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .share-profit {
      margin: 0;
      color: #5eead4;
      font-size: clamp(2rem, 8vw, 3.4rem);
      font-weight: 800;
      letter-spacing: -.055em;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }
    .share-profit.negative { color: #fda4af; }
    .share-metrics, .share-details, .share-inputs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .8rem;
    }
    .share-metric, .share-detail, .share-input {
      min-width: 0;
      padding: 1rem;
      border: 1px solid rgba(148, 163, 184, .14);
      border-radius: 14px;
      background: rgba(15, 29, 50, .72);
    }
    .share-metric span, .share-detail span, .share-input span {
      display: block;
      margin-bottom: .4rem;
      color: #94a3b8;
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .share-metric strong, .share-detail strong, .share-input strong {
      display: block;
      color: #f1f5f9;
      font-size: 1.05rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .share-metric:nth-child(1) { border-top: 2px solid #5eead4; }
    .share-metric:nth-child(2) { border-top: 2px solid #67e8f9; }
    .share-metric:nth-child(3) { border-top: 2px solid #a5b4fc; }
    .share-section {
      padding: 1.15rem;
      border: 1px solid rgba(148, 163, 184, .14);
      border-radius: 16px;
      background: rgba(10, 22, 40, .76);
    }
    .share-section h2 {
      margin: 0 0 .85rem;
      color: #e2e8f0;
      font-size: 1rem;
      letter-spacing: -.01em;
    }
    .share-decision {
      display: flex;
      align-items: flex-start;
      gap: .8rem;
      padding: 1rem;
      border: 1px solid rgba(103, 232, 249, .2);
      border-radius: 12px;
      background: rgba(8, 145, 178, .08);
    }
    .share-decision-mark {
      flex: 0 0 auto;
      display: grid;
      width: 2rem;
      height: 2rem;
      place-items: center;
      border-radius: 10px;
      background: rgba(103, 232, 249, .12);
      color: #67e8f9;
      font-weight: 800;
    }
    .share-decision p { margin: 0; }
    .share-decision strong { color: #cffafe; }
    .share-decision-copy { margin-top: .35rem !important; color: #a5b4c8; line-height: 1.6; }
    .share-risk {
      display: inline-block;
      margin-top: .65rem;
      padding: .25rem .65rem;
      border: 1px solid rgba(251, 191, 36, .24);
      border-radius: 999px;
      background: rgba(245, 158, 11, .09);
      color: #fcd34d;
      font-size: .78rem;
      font-weight: 700;
    }
    .share-footer {
      margin: .25rem 0 0;
      color: #64748b;
      font-size: .72rem;
      line-height: 1.5;
      text-align: center;
    }
    .share-error {
      padding: 1.25rem;
      border: 1px solid rgba(251, 113, 133, .25);
      border-radius: 14px;
      background: rgba(159, 18, 57, .1);
      color: #fecdd3;
      text-align: center;
    }
    @media (max-width: 520px) {
      .share-metrics, .share-details, .share-inputs { grid-template-columns: 1fr; }
      .share-section { padding: .9rem; }
    }
  `;
  document.head.appendChild(style);
}

function formatMetric(key, value) {
  if (/%|margin|roi/i.test(key)) return percent(value);
  if (/units|hours|covers/i.test(key)) {
    const number = Number(value);
    return (Number.isFinite(number) ? number : 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return `R ${formatNum(value)}`;
}

const detailFields = {
  consulting: [
    ["totalRevenue", "Total revenue", "money"],
    ["totalCosts", "Total costs", "money"],
    ["profitPerHour", "Profit per hour", "money"],
    ["breakevenHours", "Break-even hours", "number"]
  ],
  construction: [
    ["breakEvenValue", "Break-even value", "money"],
    ["totalCosts", "Total costs", "money"],
    ["monthlyProfit", "Monthly profit", "money"],
    ["annualProfit", "Annual profit", "money"]
  ],
  manufacturing: [
    ["revenue", "Revenue", "money"],
    ["totalCosts", "Total costs", "money"],
    ["costPerUnit", "Cost per unit", "money"],
    ["breakEvenUnits", "Break-even units", "number"]
  ],
  restaurant: [
    ["monthlyRevenue", "Monthly revenue", "money"],
    ["dailyCovers", "Daily covers", "number"],
    ["breakEven", "Break-even covers", "number"],
    ["breakevenCovers", "Break-even covers", "number"]
  ]
};

function renderDetails(type, results) {
  const fields = detailFields[type] || [];
  const entries = fields
    .filter(([key]) => results[key] !== undefined && results[key] !== null && results[key] !== "")
    .filter(([, label], index, all) => all.findIndex((entry) => entry[1] === label) === index);

  if (!entries.length) return "";

  return `
    <section class="share-section" aria-label="Business performance details">
      <h2>Business performance</h2>
      <div class="share-details">
        ${entries.map(([key, label, kind]) => `
          <div class="share-detail">
            <span>${escapeHTML(label)}</span>
            <strong>${kind === "money" ? `R ${formatNum(results[key])}` : escapeHTML(formatMetric(key, results[key]))}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderInputs(inputs) {
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) return "";

  const entries = Object.entries(inputs)
    .filter(([key, value]) => !/(password|secret|token|authorization|api.?key)/i.test(key))
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value) && value !== "")
    .slice(0, 12);

  if (!entries.length) return "";

  return `
    <section class="share-section" aria-label="Project assumptions">
      <h2>Project assumptions</h2>
      <div class="share-inputs">
        ${entries.map(([key, value]) => `
          <div class="share-input">
            <span>${escapeHTML(labelFor(key))}</span>
            <strong>${escapeHTML(value)}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderReport(deal) {
  const results = deal.results && typeof deal.results === "object" ? deal.results : {};
  const type = String(deal.type || "business");
  const title = deal.title || (deal.meta && deal.meta.title) || "Business Analysis";
  const profit = Number(results.profit) || 0;
  const status = results.status || results.decision;
  const recommendation = results.action || results.advice;
  const riskLevel = results.riskLevel;

  titleEl.textContent = title;
  document.title = `${title} | Shared Business Analysis`;

  contentEl.innerHTML = `
    <div class="share-report">
      <section class="share-hero" aria-label="Financial summary">
        <p class="report-kicker">${escapeHTML(labelFor(type))} analysis</p>
        <p class="share-profit-label">Net profit</p>
        <p class="share-profit${profit < 0 ? " negative" : ""}">R ${formatNum(profit)}</p>
      </section>

      <div class="share-metrics" aria-label="Key performance indicators">
        <div class="share-metric">
          <span>Profit margin</span>
          <strong>${percent(results.margin)}</strong>
        </div>
        <div class="share-metric">
          <span>Return on investment</span>
          <strong>${percent(results.roi)}</strong>
        </div>
        <div class="share-metric">
          <span>Project status</span>
          <strong>${escapeHTML(status || "Analysis complete")}</strong>
        </div>
      </div>

      ${renderDetails(type, results)}
      ${status || recommendation || riskLevel ? `
        <section class="share-section" aria-label="Decision and recommendation">
          <h2>Decision &amp; recommendation</h2>
          <div class="share-decision">
            <span class="share-decision-mark" aria-hidden="true">i</span>
            <div>
              ${status ? `<p><strong>${escapeHTML(status)}</strong></p>` : ""}
              ${recommendation ? `<p class="share-decision-copy">${escapeHTML(recommendation)}</p>` : ""}
              ${riskLevel ? `<span class="share-risk">Risk level: ${escapeHTML(riskLevel)}</span>` : ""}
            </div>
          </div>
        </section>
      ` : ""}
      ${renderInputs(deal.inputs)}
      <p class="share-footer">Shared business analysis · Sandile SystemsWorks</p>
    </div>
  `;
}

async function loadShare() {
  addShareStyles();

  if (!id) {
    contentEl.innerHTML = `<p class="share-error">This share link is missing its report ID. Please check the link and try again.</p>`;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/share/${encodeURIComponent(id)}`);

    if (!response.ok) {
      contentEl.innerHTML = `<p class="share-error">This analysis could not be found. The share link may have expired or been removed.</p>`;
      return;
    }

    const deal = await response.json();
    renderReport(deal);
  } catch (error) {
    console.error("Load Share Error:", error);
    contentEl.innerHTML = `<p class="share-error">We could not load this analysis right now. Please refresh the page or try again later.</p>`;
  }
}

loadShare();
