(() => {

  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";
  const $ = (id) => document.getElementById(id);

  let debounceTimer;
  let latestData = null;
  let latestInputs = null;

  function getProjectName() {
    return $("client-name-input")?.value.trim() || "Construction project";
  }

/* ================= FORMATTERS ================= */
  const money = (v) =>
    (Number(v) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const percent = (v) => {
    let n = Number(v);
    if (!isFinite(n)) return "0.00%";
    
    // Safeguard/Clamp margin percentage between logical business limits (-100% to +100%)
    if (n < -100) n = -100;
    if (n > 100) n = 100;

    return n.toFixed(2) + "%";
  };

  function renderDecisionInsights(options) {
    const number = value => {
      const result = Number(value);
      return Number.isFinite(result) ? result : 0;
    };
    const revenue = Math.max(0, number(options.revenue));
    const costs = Math.max(0, number(options.costs));
    const profit = Number.isFinite(Number(options.profit))
      ? number(options.profit)
      : revenue - costs;
    const hasRevenue = revenue > 0;
    const hasCosts = costs > 0;
    const margin = hasRevenue ? Math.max(-100, Math.min(100, profit / revenue * 100)) : null;
    const roi = hasCosts ? Math.max(-1000, Math.min(1000, profit / costs * 100)) : null;
    const lines = [];
    let recommendation;
    let level;

    if (!hasRevenue && !hasCosts) {
      recommendation = "INSUFFICIENT DATA — ENTER REVENUE AND COSTS";
      level = "caution";
      lines.push("Enter positive revenue and cost assumptions to generate a reliable profitability decision.");
    } else {
      lines.push(
        `Total costs are R${money(costs)} against contract value of R${money(revenue)}. ` +
        (profit >= 0
          ? `Projected net profit is R${money(profit)}.`
          : `Projected net loss is R${money(profit)}.`)
      );
      lines.push(margin === null
        ? "Net margin is unavailable because revenue is zero; enter revenue before relying on percentage benchmarks."
        : `Projected net margin is ${margin.toFixed(1)}%. Construction projects should target at least 12-15% net margin to absorb overruns; margins below 12% are high risk.`);
      lines.push(roi === null
        ? "ROI is unavailable because total costs are zero."
        : `Projected ROI on total costs is ${roi.toFixed(1)}%.`);

      if (profit < 0) {
        recommendation = "CRITICAL LOSS — DO NOT ACCEPT AT THIS PRICE";
        level = "danger";
      } else if (profit === 0) {
        recommendation = "NO PROFIT BUFFER — RENEGOTIATE BEFORE PROCEEDING";
        level = "caution";
      } else if (margin === null || margin < 12) {
        recommendation = "HIGH RISK — RENEGOTIATE PRICING OR REDUCE COSTS";
        level = "danger";
      } else if (margin < 15) {
        recommendation = "PROCEED WITH CAUTION — IMPROVE THE PROFIT BUFFER";
        level = "caution";
      } else {
        recommendation = "STRONG PROJECT — GOOD TO PROCEED";
        level = "success";
      }
    }

    lines.unshift(recommendation);
    const decision = typeof options.decision === "string"
      ? options.decision
      : options.decision?.status || options.decision?.advice || "";
    const rawDecision = String(decision).toLowerCase();
    const risk = String(options.riskLevel || options.decision?.riskLevel || "").toLowerCase();
    const rejected = rawDecision.includes("reject") || rawDecision.includes("loss") || profit < 0;
    const approved = rawDecision.includes("approve") || rawDecision.includes("strong");
    let tone;
    let label;
    if (rejected) {
      tone = "danger";
      label = "✖ Unviable Margin";
    } else if (risk === "high" || (!approved && (risk === "medium" || rawDecision.includes("review")))) {
      tone = "caution";
      label = "⚠ High Risk";
    } else if (approved || risk === "low") {
      tone = "success";
      label = "✔ Viable Deal";
    } else if (level === "danger") {
      tone = "danger";
      label = "✖ Unviable Margin";
    } else if (level === "success") {
      tone = "success";
      label = "✔ Viable Deal";
    } else {
      tone = "caution";
      label = "⚠ Review Required";
    }

    const advice = options.advice || options.decision?.advice;
    if (advice) lines.push(`Calculator guidance: ${advice}`);

    if (options.status) {
      options.status.textContent = label;
      options.status.className = tone === "danger" ? "negative" : tone === "caution" ? "caution" : "positive";
    }
    if (options.container) {
      const narrative = document.createElement("section");
      narrative.className = `decision-insights decision-insights-${level}`;
      const heading = document.createElement("strong");
      heading.textContent = "Decision Insights";
      narrative.appendChild(heading);
      lines.forEach(text => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        narrative.appendChild(paragraph);
      });
      options.container.replaceChildren(narrative);
    }
    return { margin, roi };
  }
  
  /* ================= INPUTS ================= */
  function getInputs() {
    return {
      value: FormattedNumberInput.getNumber($("const-value")),
      material: FormattedNumberInput.getNumber($("const-material")),
      laborMonthly: FormattedNumberInput.getNumber($("const-labor")),
      equipmentMonthly: FormattedNumberInput.getNumber($("const-equipment")),
      fixedMonthly: FormattedNumberInput.getNumber($("const-fixed")),
      months: FormattedNumberInput.getNumber($("const-duration"))
    };
  }

  function addToCompare() {
    if (!latestData) return alert("Run the engine first to calculate project data.");
    const saved = window.DealCompare?.addCurrentScenario({
      type: "construction",
      name: getProjectName(),
      inputs: getInputs(),
      calculatedInputs: latestInputs,
      results: latestData
    });
    if (saved) window.location.href = "compare.html";
  }

  /* ================= COLOR ================= */
  /* ================= LOAD EDIT (FIXED LIFECYCLE) ================= */
  function loadEditDeal() {
    const compareScenario = window.DealCompare?.getEditingScenario("construction");
    if (compareScenario) {
      const i = compareScenario.inputs || {};
      $("client-name-input").value = compareScenario.name || "";
      $("const-value").value = i.value ?? "";
      $("const-material").value = i.material ?? "";
      $("const-labor").value = i.laborMonthly ?? "";
      $("const-equipment").value = i.equipmentMonthly ?? "";
      $("const-fixed").value = i.fixedMonthly ?? "";
      $("const-duration").value = i.months ?? "";
      $("compareBtn").querySelector("span").textContent = "Update Compare";
      run();
      return;
    }

    const edit = localStorage.getItem("editDeal");
    if (!edit) {
      // No edit profile found, run standard calculator default init setup
      run();
      return;
    }

    try {
      const deal = JSON.parse(edit);
      const i = deal.inputs || deal;

      // 1. Set the Project/Client Name
      const nameInput = $("client-name-input");
      if (nameInput) {
        nameInput.value = deal.clientName || deal.name || "";
      }

      // 2. Map numbers back to inputs cleanly
      if ($("const-value")) $("const-value").value = i.value || i.contractValue || 0;
      if ($("const-material")) $("const-material").value = i.material || i.materialCost || 0;
      if ($("const-labor")) $("const-labor").value = i.laborMonthly || i.laborCost || 0;
      if ($("const-equipment")) $("const-equipment").value = i.equipmentMonthly || i.equipmentCost || 0;
      if ($("const-fixed")) $("const-fixed").value = i.fixedMonthly || i.fixedCosts || 0;
      if ($("const-duration")) $("const-duration").value = i.months || i.duration || 0;

      // 3. Execution alignment: Run calculation strictly AFTER DOM elements are fully updated
      run();

    } catch (err) {
      console.error("Load error:", err);
      run(); // Fallback to safe execution on structural failure
    }
  }

    /* ================= RUN ENGINE ================= */
  async function run() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const inputs = getInputs();
    try {
      const res = await fetch(`${API_BASE}/api/calculators/construction/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(inputs)
      });

      if (!res.ok) return;

      const d = await res.json();
      const report = renderDecisionInsights({
        status: $("decision-status"),
        container: $("decision-advice"),
        revenue: d.value ?? d.revenue ?? inputs.value,
        costs: d.totalCosts,
        profit: d.profit,
        decision: d.decision,
        advice: d.advice,
        riskLevel: d.riskLevel
      });
      latestData = d;
      latestInputs = { ...inputs };

      // 1. Inject Text Metrics
      $("const-total-costs").textContent = money(d.totalCosts);
      $("const-profit").textContent = money(d.profit);
      $("const-breakeven").textContent = money(d.breakEvenValue);
      $("const-monthly-profit").textContent = money(d.monthlyProfit);
      $("const-annual-profit").textContent = money(d.annualProfit);

      // 2. Inject Percentage Metrics with Dynamic Coloring
      const marginEl = $("const-margin");
      const roiEl = $("const-roi");

      marginEl.textContent = report.margin === null ? "—" : percent(report.margin);
      roiEl.textContent = report.roi === null ? "—" : percent(report.roi);

  // Apply color logic factoring in the risk level for percentages
      applyMetricColoring($("const-profit"), d.profit, d.riskLevel, false);
      applyMetricColoring(marginEl, report.margin, d.riskLevel, true);
      applyMetricColoring(roiEl, report.roi, d.riskLevel, true);
      applyMetricColoring($("const-monthly-profit"), d.monthlyProfit, d.riskLevel, false);
      applyMetricColoring($("const-annual-profit"), d.annualProfit, d.riskLevel, false);

      // 3. Inject Decision Status
      renderInsights(d.insights || {});

    } catch (err) {
      console.error("Engine failure:", err);
    }
  }

/* ================= HELPER: DYNAMIC COLORING (RISK-AWARE) ================= */
  function applyMetricColoring(el, value, riskLevel = "Low", isPercentage = false) {
    if (!el) return;
    el.classList.remove("positive", "caution", "negative");
    const number = Number(value);

    if (!isFinite(number) || number === 0) {
      el.classList.add("caution");
      return;
    }

    // If it's a percentage metric (Margin/ROI) and the risk level is High/Medium, override to warning colors
    if (isPercentage && (riskLevel === "High" || riskLevel === "Medium")) {
      el.classList.add(riskLevel === "High" ? "negative" : "caution");
      return;
    }

    // Standard raw value fallback
    el.classList.add(number > 0 ? "positive" : "negative");
  }
  /* ================= INSIGHTS ================= */
  function renderInsights(insights) {
    const container = $("const-insights");
    if (!container) return;

    container.innerHTML = "";

    const main = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "INSIGHTS";

    const inner = document.createElement("div");
    inner.style.marginTop = "10px";

    Object.entries(insights).forEach(([group, items]) => {
      const groupBox = document.createElement("details");
      const groupTitle = document.createElement("summary");
      groupTitle.textContent = group.toUpperCase();

      const body = document.createElement("div");
      body.style.marginTop = "8px";

      (items || []).forEach((i, idx) => {
        const div = document.createElement("div");
        div.className = "step";
        div.innerHTML = `
          <strong>${idx + 1}. ${i.title}</strong>
          <div>${i.message}</div>
        `;
        body.appendChild(div);
      });

      groupBox.appendChild(groupTitle);
      groupBox.appendChild(body);
      inner.appendChild(groupBox);
    });

    main.appendChild(summary);
    main.appendChild(inner);
    container.appendChild(main);
  }

  /* ================= SAVE / UPDATE (PATCHED & SECURED) ================= */
async function saveDeal(e) {
  // Force the browser to abandon standard navigation or page reloads instantly
  if (e) {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }

  if (!latestData) return alert("Run the engine first to calculate project data.");

  const token = localStorage.getItem("token");
  let editId = localStorage.getItem("editDealId");
  const clientNameValue = getProjectName();

  const payload = {
    type: "construction",
    clientName: clientNameValue,
    inputs: getInputs(),
    results: {
      profit: latestData.profit,
      margin: latestData.margin,
      roi: latestData.roi,
      revenue: latestData.value || latestData.revenue || getInputs().value,
      status: latestData.decision,
      riskLevel: latestData.riskLevel
    }
  };

  try {

    // ================= UPDATE EXISTING DEAL =================
    if (editId) {

      let res = await fetch(`${API_BASE}/api/saved-deals/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      // If the deal no longer exists, automatically save as a new one
      if (res.status === 404) {

        console.warn("Stored editDealId no longer exists. Creating a new deal.");

        localStorage.removeItem("editDeal");
        localStorage.removeItem("editDealId");
        editId = null;

        res = await fetch(`${API_BASE}/api/saved-deals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const serverErr = await res.text();
        console.error("Backend rejection log:", serverErr);
        throw new Error(`Server error response code: ${res.status}`);
      }

    }

    // ================= CREATE NEW DEAL =================
    else {

      const res = await fetch(`${API_BASE}/api/saved-deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const serverErr = await res.text();
        console.error("Backend rejection log:", serverErr);
        throw new Error(`Server error response code: ${res.status}`);
      }

    }

    alert(
      editId
        ? `Successfully Updated: ${clientNameValue}`
        : `Successfully Saved: ${clientNameValue}`
    );

    // Clean local pipeline cache state
    localStorage.removeItem("editDeal");
    localStorage.removeItem("editDealId");

    if ($("client-name-input")) {
      $("client-name-input").value = "";
    }

    // Re-route clean back to dashboard layout view
    window.location.href = "industry-construction.html";

  } catch (err) {
    console.error("Save system crash trajectory:", err);
    alert("Could not commit updates to the database. Verify console network telemetry logs.");
  }
}

  /* ================= RESET ================= */
  function resetAll() {
    document.querySelectorAll(".input-section input").forEach(i => i.value = "");
    latestData = null;
    latestInputs = null;

    $("decision-status").textContent = "—";
    $("decision-status").className = "";
    $("decision-advice").textContent = "";
    $("const-insights").innerHTML = "";

    [
      "const-total-costs",
      "const-profit",
      "const-margin",
      "const-roi",
      "const-breakeven",
      "const-monthly-profit",
      "const-annual-profit"
    ].forEach(id => {
      const el = $(id);
      if (el) {
        el.textContent = "—";
        el.classList.remove("positive", "caution", "negative");
      }
    });
  }

  /* ================= EXPORT TO CSV ================= */
  function exportToCsv() {
    if (!latestData) return alert("Run the engine first to generate data.");

    const inputs = getInputs();
    const projectName = getProjectName();

    const rows = [
      ["Category", "Label", "Value"],
      ["Project Info", "Project Name", projectName],
      ["Inputs", "Contract Value", inputs.value],
      ["Inputs", "Material Cost", inputs.material],
      ["Inputs", "Labor (Monthly)", inputs.laborMonthly],
      ["Inputs", "Duration (Months)", inputs.months],
      ["", "", ""],
      ["Results", "Total Costs", latestData.totalCosts],
      ["Results", "Net Profit", latestData.profit],
      ["Results", "Margin", latestData.margin + "%"],
      ["Results", "ROI", latestData.roi + "%"],
      ["Results", "Break Even", latestData.breakEvenValue],
      ["Decision", "Status", latestData.decision]
    ];

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${projectName.replace(/\s+/g, '_')}_Report.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* ================= EXPORT REPORT (PRINT) ================= */
  async function exportReport() {
    if (!latestData) return alert("Run the engine first to generate data.");

    const projectName = getProjectName();
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    try {
      await generateConstructionPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("The construction PDF report could not be generated. Please try again.");
    }
  }

  function generateConstructionPdf(projectName, dateStr) {
    const i = getInputs();
    const d = latestData;
    return window.SandileReportPdf.download({
      projectName,
      reportTitle: "Construction Intelligence & Profitability Report",
      date: dateStr,
      sections: [
        {
          title: "Project Inputs",
          rows: [
            ["Contract value", money(i.value)],
            ["Material cost", money(i.material)],
            ["Labor cost (monthly)", money(i.laborMonthly)],
            ["Equipment cost (monthly)", money(i.equipmentMonthly)],
            ["Fixed costs (monthly)", money(i.fixedMonthly)],
            ["Duration (months)", i.months]
          ]
        },
        {
          title: "Calculated Results",
          rows: [
            ["Total costs", money(d.totalCosts)],
            ["Net profit", money(d.profit)],
            ["Margin", percent(d.margin)],
            ["ROI", percent(d.roi)],
            ["Break-even value", money(d.breakEvenValue)],
            ["Monthly profit", money(d.monthlyProfit)],
            ["Annual profit", money(d.annualProfit)],
            ["Decision", d.decision || "—"],
            ["Advice", d.advice || "—"]
          ]
        }
      ],
      filename: projectName || "construction"
    });
  }

  /* ================= SHARE DEAL ================= */
  async function shareDeal() {
    if (!latestData) return alert("Run the engine first to generate data.");

    const token = localStorage.getItem("token");
    const projectName = getProjectName();
    
    const payload = {
      shareId: "share_" + Math.random().toString(36).substring(2, 9), 
      type: "construction",
      inputs: getInputs(), 
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.roi,
        status: latestData.decision,
        riskLevel: latestData.riskLevel,
        breakEvenValue: latestData.breakEvenValue,
        totalCosts: latestData.totalCosts,
        monthlyProfit: latestData.monthlyProfit,
        annualProfit: latestData.annualProfit,
        advice: latestData.advice
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
      const shareUrl = `${window.location.origin}/share.html?id=${finalId}`;

      const shareMessage = 
        `🏗️ Project Intelligence Report: ${projectName}\n` +
        `View full analysis results here:\n${shareUrl}\n\n` +
        `Generated by Sandile SystemsWorks`;

      if (navigator.share) {
        await navigator.share({
          title: 'Project Profitability Report',
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

  /* ================= EVENTS ================= */
  [
    "const-value",
    "const-material",
    "const-labor",
    "const-equipment",
    "const-fixed",
    "const-duration"
  ].forEach(id => {
    $(id)?.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(run, 300);
    });
  });

  window.ButtonLoading.bind($("resetBtn"), resetAll);
  
  // 🎯 SECURED BINDINGS: Passing standard explicitly structured events to block browser overrides
  window.ButtonLoading.bind($("saveDealBtn"), saveDeal);
  window.ButtonLoading.bind($("exportCsvBtn"), exportToCsv);
  window.ButtonLoading.bind($("exportReportBtn"), exportReport);
  window.ButtonLoading.bind($("shareBtn"), shareDeal);
  window.ButtonLoading.bind($("compareBtn"), addToCompare);

  /* ================= INIT CONTROL FLOW ================= */
  // Pull historical records safely; it handles its own internal lifecycle call to run()
  loadEditDeal();

})();
