(() => {

  const $ = (id) => document.getElementById(id);
  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";

  let debounceTimer;
  let latestData = null;

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
      hours: +$("consult-hours")?.value || 0,
      rate: +$("consult-rate")?.value || 0,
      expenses: +$("consult-expenses")?.value || 0,
      labor: +$("consult-labor")?.value || 0,
      fixed: +$("consult-fixed")?.value || 0,
      discountPct: +$("consult-discount")?.value || 0,
      otHours: +$("consult-overtime-hours")?.value || 0,
      otRate: +$("consult-overtime-rate")?.value || 0,
      variableCosts: +$("consult-variable-costs")?.value || 0,
      contingencyPct: +$("consult-contingency")?.value || 0
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

    const data = await api("/api/calculators/consulting/project", "POST", getInputs());

    if (!data) return;
    latestData = data;

    /* ================= OUTPUTS ================= */
    $("consult-revenue").textContent = money(data.totalRevenue);
    $("consult-revenue-after-discount").textContent = money(data.revenueAfterDiscount);
    $("consult-overtime-output").textContent = money(data.overtimeRevenue);

    $("consult-contingency-output").textContent = money(data.contingencyAmount);
    $("consult-cost-hour").textContent = money(data.costPerHour);
    $("consult-costs").textContent = money(data.totalCosts);

    $("consult-profit").textContent = money(data.profit);
    $("consult-profit-hour").textContent = money(data.profitPerHour);
    $("consult-margin").textContent = percent(data.margin);
    $("consult-roi").textContent = percent(data.roi);

    $("consult-breakeven").textContent = (data.breakevenHours || 0).toFixed(2);

    /* ================= STATUS ================= */
    const statusEl = $("status");
    const adviceEl = $("decisionAdvice");

    statusEl.textContent = data.decision || "—";
    adviceEl.textContent = data.advice || "";

    statusEl.className =
      data.riskLevel === "High" ? "loss"
      : data.riskLevel === "Medium" ? "neutral"
      : "profit";

    /* ================= COLORS ================= */
    const profitEl = $("consult-profit");
    if (profitEl) {
      profitEl.style.color = data.profit >= 0 ? "#22c55e" : "#ef4444";
    }

    /* ================= STEPS ================= */
    renderSteps(data.steps);
  }

  function renderSteps(steps) {
    const container = $("consult-steps");
    if (!container || !steps) return;

    container.innerHTML = steps.map((s, i) => `
      <div class="step">
        <strong>Step ${i + 1}</strong>
        <div>${s}</div>
      </div>
    `).join("");
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

    const projectName = $("consult-project-name")?.value.trim() || "Consulting Project Analysis";
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if ($("print-project-name")) $("print-project-name").textContent = projectName;
    if ($("print-date")) $("print-date").textContent = dateStr;

    try {
      if (!window.jspdf?.jsPDF) {
        const pdfScript = document.createElement("script");
        pdfScript.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
        pdfScript.onload = () => generateConsultingPdf(projectName, dateStr);
        pdfScript.onerror = () => window.print();
        document.head.appendChild(pdfScript);
        return;
      }

      generateConsultingPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    }
  }

  function generateConsultingPdf(projectName, dateStr) {
    const { jsPDF } = window.jspdf;
    const d = latestData;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let y = 56;

    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 595, 842, "F");
    doc.setTextColor(229, 231, 235);
    doc.setFontSize(22);
    doc.text("Sandile SystemsWorks", margin, y);
    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text("Project Intelligence & Profitability Report", margin, y + 18);
    doc.setTextColor(34, 197, 94);
    doc.text(projectName, margin, y + 38, { maxWidth: 515 });
    doc.setTextColor(148, 163, 184);
    doc.text(dateStr, margin, y + 56);
    doc.setDrawColor(0, 180, 216);
    doc.line(margin, y + 68, 555, y + 68);

    y = y + 108;
    const rows = [
      ["Total hours", getInputs().hours],
      ["Hourly rate", money(getInputs().rate)],
      ["Project expenses", money(getInputs().expenses)],
      ["Labor cost", money(getInputs().labor)],
      ["Fixed costs", money(getInputs().fixed)],
      ["Discount %", percent(getInputs().discountPct)],
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
    ];

    rows.forEach(([label, value]) => {
      if (y > 760) {
        doc.addPage();
        y = 56;
      }
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(10);
      doc.text(String(label), margin, y);
      doc.setTextColor(229, 231, 235);
      doc.setFontSize(11);
      doc.text(String(value), margin + 180, y, { maxWidth: 320 });
      y += 20;
    });

    const filename = projectName
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "consulting";
    doc.save(`${filename}-report.pdf`);
  }

/* ================= SHARE DEAL (VERCEL ROOT) ================= */
  async function shareDeal() {
    if (!latestData) return alert("Run calculator first");

    const token = localStorage.getItem("token");
    const projectName = $("consult-project-name")?.value || "Consulting Project Analysis";
    
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

  /* ================= SAVE / UPDATE ================= */
  async function saveDeal() {
    if (!latestData) return alert("Run calculator first");

    const editId = localStorage.getItem("editDealId");
    const clientNameValue = $("consult-project-name")?.value || "Untitled Project";
    const payload = {
      type: "consulting",
      clientName: clientNameValue,
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
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
    $("status").textContent = "—";
    $("status").className = "";
    $("decisionAdvice").textContent = "";
    $("consult-steps").innerHTML = "";
    
    [
      "consult-revenue","consult-revenue-after-discount",
      "consult-overtime-output","consult-contingency-output",
      "consult-cost-hour","consult-costs",
      "consult-profit","consult-profit-hour",
      "consult-margin","consult-roi","consult-breakeven"
    ].forEach(id => { if($(id)) $(id).textContent = "—"; });
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".input-section input:not(#consult-project-name)")
      .forEach(i => i.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runConsulting, 300);
      }));

    $("resetBtn")?.addEventListener("click", resetAll);
    $("saveDealBtn")?.addEventListener("click", saveDeal);
    $("exportCsvBtn")?.addEventListener("click", exportCSV);
    $("exportReportBtn")?.addEventListener("click", exportReport);
    $("shareBtn")?.addEventListener("click", shareDeal);

    // Handle Edit Mode
    const editDeal = JSON.parse(localStorage.getItem("editDeal"));
    if (editDeal && editDeal.type === "consulting") {
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
