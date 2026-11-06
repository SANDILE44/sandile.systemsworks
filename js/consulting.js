(() => {

  const $ = (id) => document.getElementById(id);
  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";

  let debounceTimer;
  let latestData = null;
  let latestInputs = null;

  function getProjectName() {
    return $("consult-project-name")?.value.trim() || "Consulting project";
  }

  function setMetricColor(element, value) {
    if (!element) return;
    element.classList.remove("positive", "negative", "caution");
    const number = Number(value);
    element.classList.add(!Number.isFinite(number) || number === 0
      ? "caution"
      : number > 0 ? "positive" : "negative");
  }

  /* ================= FORMATTERS ================= */
  const money = (v) =>
    (Number(v) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const percent = (v) =>
    (Number(v) || 0).toFixed(2) + "%";

  /* ================= INPUTS ================= */
  function getInputs() {
    return {
      hours: FormattedNumberInput.getNumber($("consult-hours")),
      rate: FormattedNumberInput.getNumber($("consult-rate")),
      expenses: FormattedNumberInput.getNumber($("consult-expenses")),
      labor: FormattedNumberInput.getNumber($("consult-labor")),
      fixed: FormattedNumberInput.getNumber($("consult-fixed")),
      discountPct: FormattedNumberInput.getNumber($("consult-discount")),
      otHours: FormattedNumberInput.getNumber($("consult-overtime-hours")),
      otRate: FormattedNumberInput.getNumber($("consult-overtime-rate")),
      variableCosts: FormattedNumberInput.getNumber($("consult-variable-costs")),
      contingencyPct: FormattedNumberInput.getNumber($("consult-contingency"))
    };
  }

  /* ================= API ================= */
  async function api(url, method = "GET", body = null) {
    const token = localStorage.getItem("token");
    if (!token) return location.replace("login.html");

    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : null
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        location.replace("login.html");
        return null;
      }

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("API error:", err);
      return null;
    }
  }

  /* ================= MAIN CALC ================= */
  async function runConsulting() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const inputs = getInputs();
    const data = await api("/api/calculators/consulting/project", "POST", inputs);

    if (!data) return;
    const report = DecisionInsights.analyze({
      industry: "consulting",
      revenue: data.revenueAfterDiscount,
      costs: data.totalCosts,
      profit: data.profit
    });
    latestData = data;
    latestInputs = { ...inputs };

    /* ================= OUTPUTS ================= */
    $("consult-revenue").textContent = money(data.totalRevenue);
    $("consult-revenue-after-discount").textContent = money(data.revenueAfterDiscount);
    $("consult-overtime-output").textContent = money(data.overtimeRevenue);

    $("consult-contingency-output").textContent = money(data.contingencyAmount);
    $("consult-cost-hour").textContent = money(data.costPerHour);
    $("consult-costs").textContent = money(data.totalCosts);

    $("consult-profit").textContent = money(data.profit);
    $("consult-profit-hour").textContent = money(data.profitPerHour);
    $("consult-margin").textContent = report.margin === null ? "—" : percent(report.margin);
    $("consult-roi").textContent = report.roi === null ? "—" : percent(report.roi);

    $("consult-breakeven").textContent = (data.breakevenHours || 0).toFixed(2);

    /* ================= STATUS ================= */
    DecisionInsights.render($("decisionAdvice"), $("status"), report, data.decision, data.riskLevel);

    /* ================= COLORS ================= */
    setMetricColor($("consult-profit"), data.profit);
    setMetricColor($("consult-margin"), report.margin);
    setMetricColor($("consult-roi"), report.roi);
  }

  /* ================= EXPORT CSV ================= */
  function exportCSV() {
    if (!latestData) return alert("Run calculator first");

    const i = getInputs();
    const rows = [
      ["Field", "Value"],
      ["Total Hours", i.hours],
      ["Hourly Rate", i.rate],
      ["Expenses", i.expenses],
      ["Labor", i.labor],
      ["Fixed", i.fixed],
      ["Discount %", i.discountPct],
      ["Total Revenue", latestData.totalRevenue],
      ["Total Costs", latestData.totalCosts],
      ["Net Profit", latestData.profit],
      ["Margin %", latestData.margin],
      ["ROI %", latestData.roi],
      ["Decision", latestData.decision]
    ];

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "consulting-analysis.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ================= EXPORT REPORT (PRINT) ================= */
  async function exportReport() {
    if (!latestData) return alert("Run calculator first");

    const projectName = getProjectName();
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    try {
      await generateConsultingPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("The consulting PDF report could not be generated. Please try again.");
    }
  }

  function generateConsultingPdf(projectName, dateStr) {
    const i = getInputs();
    const d = latestData;
    return window.SandileReportPdf.download({
      projectName,
      reportTitle: "Consulting Intelligence & Profitability Report",
      date: dateStr,
      sections: [
        {
          title: "Project Inputs",
          rows: [
            ["Total hours", i.hours],
            ["Hourly rate", money(i.rate)],
            ["Project expenses", money(i.expenses)],
            ["Labor cost", money(i.labor)],
            ["Fixed costs", money(i.fixed)],
            ["Discount", percent(i.discountPct)]
          ]
        },
        {
          title: "Calculated Results",
          rows: [
            ["Total revenue", money(d.totalRevenue)],
            ["Revenue after discount", money(d.revenueAfterDiscount)],
            ["Overtime revenue", money(d.overtimeRevenue)],
            ["Total costs", money(d.totalCosts)],
            ["Contingency amount", money(d.contingencyAmount)],
            ["Profit", money(d.profit)],
            ["Profit per hour", money(d.profitPerHour)],
            ["Margin", percent(d.margin)],
            ["ROI", percent(d.roi)],
            ["Break-even hours", (d.breakevenHours || 0).toFixed(2)],
            ["Decision", d.decision || "—"],
            ["Advice", d.advice || "—"]
          ]
        }
      ],
      filename: projectName || "consulting"
    });
  }

/* ================= SHARE DEAL (VERCEL ROOT) ================= */
  async function shareDeal() {
    if (!latestData) return alert("Run calculator first");

    const token = localStorage.getItem("token");
    const projectName = getProjectName();
    
    // 1. Construct the payload to match the backend SharedDealSchema
    const payload = {
      shareId: "share_" + Math.random().toString(36).substring(2, 9), 
      type: "consulting",
      inputs: getInputs(), 
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.roi,
        status: latestData.decision,
        riskLevel: latestData.riskLevel || "Medium",
        action: latestData.advice,
        totalRevenue: latestData.totalRevenue,
        totalCosts: latestData.totalCosts,
        profitPerHour: latestData.profitPerHour,
        breakevenHours: latestData.breakevenHours
      },
      meta: {
        title: projectName,
        createdBy: "Sandile"
      },
      permissions: {
        mode: "view",
        isPublic: true
      }
    };

    try {
      const res = await fetch(`${API_BASE}/api/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server Response Error:", errorText);
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      const finalId = data.shareId || data.id || data._id;

      // 2. Clean root URL generation for Vercel 
      const shareUrl = `${window.location.origin}/share.html?id=${finalId}`;

      const shareMessage = 
        `💼 Consulting Project Analysis: ${projectName}\n` +
        `View full analysis results here:\n${shareUrl}\n\n` +
        `Generated by Sandile SystemsWorks`;

      if (navigator.share) {
        await navigator.share({
          title: 'Consulting Analysis Report',
          text: shareMessage,
          url: shareUrl 
        });
      } else {
        await navigator.clipboard.writeText(shareMessage);
        alert("Analysis link and summary copied to clipboard!");
      }

    } catch (err) {
      console.error('Sharing Error:', err);
      alert("Action failed. Please check the console for details.");
    }
  }

  function addToCompare() {
    if (!latestData) return alert("Run the calculator first.");
    const saved = window.DealCompare?.addCurrentScenario({
      type: "consulting",
      name: getProjectName(),
      inputs: getInputs(),
      calculatedInputs: latestInputs,
      results: latestData
    });
    if (saved) window.location.href = "compare.html";
  }

  /* ================= SAVE / UPDATE ================= */
  async function saveDeal() {
    if (!latestData) return alert("Run calculator first");

    const editId = localStorage.getItem("editDealId");
    const clientNameValue = getProjectName();
    const payload = {
      type: "consulting",
      clientName: clientNameValue,
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.roi,
        revenue: latestData.totalRevenue
      }
    };

    const url = editId ? `/api/saved-deals/${editId}` : "/api/saved-deals";
    const method = editId ? "PUT" : "POST";

    const res = await api(url, method, payload);
    if (res) {
      alert(editId ? "Deal updated" : "Deal saved");
      localStorage.removeItem("editDeal");
      localStorage.removeItem("editDealId");
    } else {
      alert("Failed to save deal");
    }
  }

  /* ================= RESET ================= */
  function resetAll() {
    document.querySelectorAll(".input-section input").forEach(i => i.value = "");
    latestData = null;
    latestInputs = null;
    $("status").textContent = "—";
    $("status").className = "";
    $("decisionAdvice").textContent = "";
    
    [
      "consult-revenue","consult-revenue-after-discount",
      "consult-overtime-output","consult-contingency-output",
      "consult-cost-hour","consult-costs",
      "consult-profit","consult-profit-hour",
      "consult-margin","consult-roi","consult-breakeven"
    ].forEach(id => {
      const element = $(id);
      if (!element) return;
      element.textContent = "—";
      element.classList.remove("positive", "negative", "caution");
    });
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".input-section input:not(#consult-project-name)")
      .forEach(i => i.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runConsulting, 300);
      }));

    window.ButtonLoading.bind($("resetBtn"), resetAll);
    window.ButtonLoading.bind($("saveDealBtn"), saveDeal);
    window.ButtonLoading.bind($("exportCsvBtn"), exportCSV);
    window.ButtonLoading.bind($("exportReportBtn"), exportReport);
    window.ButtonLoading.bind($("shareBtn"), shareDeal);
    window.ButtonLoading.bind($("compareBtn"), addToCompare);

    // Handle Edit Mode
    const compareScenario = window.DealCompare?.getEditingScenario("consulting");
    const editDeal = JSON.parse(localStorage.getItem("editDeal"));
    if (compareScenario) {
      const i = compareScenario.inputs || {};
      $("consult-project-name").value = compareScenario.name || "";
      $("consult-hours").value = i.hours ?? "";
      $("consult-rate").value = i.rate ?? "";
      $("consult-expenses").value = i.expenses ?? "";
      $("consult-labor").value = i.labor ?? "";
      $("consult-fixed").value = i.fixed ?? "";
      $("consult-discount").value = i.discountPct ?? "";
      $("consult-overtime-hours").value = i.otHours ?? "";
      $("consult-overtime-rate").value = i.otRate ?? "";
      $("consult-variable-costs").value = i.variableCosts ?? "";
      $("consult-contingency").value = i.contingencyPct ?? "";
      $("compareBtn").querySelector("span").textContent = "Update Compare";
      runConsulting();
    } else if (editDeal && editDeal.type === "consulting") {
      const i = editDeal.inputs || {};
      $("consult-project-name").value = editDeal.clientName || editDeal.name || "";
      $("consult-hours").value = i.hours || "";
      $("consult-rate").value = i.rate || "";
      $("consult-expenses").value = i.expenses || "";
      $("consult-labor").value = i.labor || "";
      $("consult-fixed").value = i.fixed || "";
      $("consult-discount").value = i.discountPct || "";
      $("consult-overtime-hours").value = i.otHours || "";
      $("consult-overtime-rate").value = i.otRate || "";
      $("consult-variable-costs").value = i.variableCosts || "";
      $("consult-contingency").value = i.contingencyPct || "";
      runConsulting();
    } else {
      runConsulting();
    }
  });

})();
