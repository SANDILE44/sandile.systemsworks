(() => {
  const $ = (id) => document.getElementById(id);
  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";

  let debounceTimer;
  let latestData = null;
  let latestInputs = null;
  let latestDecisionReport = null;

  function getProjectName() {
    return $("mfg-project-name")?.value.trim() || "Manufacturing project";
  }

  /* ================= FORMATTERS ================= */
  const money = (v) =>
    (Number(v) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const percent = (v) => {
    const n = Number(v);
    return isFinite(n) ? n.toFixed(2) + "%" : "0.00%";
  };

  /* ================= SAFE DIVISION ================= */
  const safeDivide = (a, b) => (!b || !isFinite(a / b)) ? 0 : a / b;

  /* ================= INPUTS ================= */
  function getInputs() {
    return {
      units: FormattedNumberInput.getNumber($("mfg-units")),
      price: FormattedNumberInput.getNumber($("mfg-price")),
      material: FormattedNumberInput.getNumber($("mfg-material")),
      labor: FormattedNumberInput.getNumber($("mfg-labor")),
      fixed: FormattedNumberInput.getNumber($("mfg-fixed")),
      operational: FormattedNumberInput.getNumber($("mfg-operational"))
    };
  }

  function addToCompare() {
    if (!latestData) return alert("Run calculation first.");
    const saved = window.DealCompare?.addCurrentScenario({
      type: "manufacturing",
      name: getProjectName(),
      inputs: getInputs(),
      calculatedInputs: latestInputs,
      results: latestData
    });
    if (saved) window.location.href = "compare.html";
  }

  /* ================= ENGINE ================= */
  function runManufacturing() {
    const i = getInputs();

    const revenue = i.units * i.price;
    const materialTotal = i.units * i.material;
    const totalCosts = materialTotal + i.labor + i.fixed + i.operational;
    const profit = revenue - totalCosts;

    latestDecisionReport = DecisionInsights.analyze({
      industry: "manufacturing",
      revenue,
      costs: totalCosts,
      profit
    });
    const margin = latestDecisionReport.margin ?? 0;
    const roi = latestDecisionReport.roi ?? 0;

    const costPerUnit = safeDivide(totalCosts, i.units);
    const profitPerUnit = safeDivide(profit, i.units);

    const breakEvenUnits =
      (i.price - i.material) > 0
        ? Math.ceil((i.labor + i.fixed + i.operational) / (i.price - i.material))
        : 0;

    latestData = {
      revenue,
      totalCosts,
      profit,
      margin,
      roi,
      costPerUnit,
      profitPerUnit,
      breakEvenUnits,
      status: latestDecisionReport.recommendation,
      action: latestDecisionReport.lines.join(" "),
      riskLevel: latestDecisionReport.level === "danger" ? "High" :
        latestDecisionReport.level === "caution" ? "Medium" : "Low"
    };
    latestInputs = { ...i };

    render(latestData);
  }

  /* ================= RENDER ================= */
  function render(d) {
    $("revenue").textContent = money(d.revenue);
    $("totalCosts").textContent = money(d.totalCosts);
    $("profit").textContent = money(d.profit);
    $("costPerUnit").textContent = money(d.costPerUnit);
    $("profitPerUnit").textContent = money(d.profitPerUnit);
    $("margin").textContent = latestDecisionReport.margin === null ? "—" : percent(d.margin);
    $("roi").textContent = latestDecisionReport.roi === null ? "—" : percent(d.roi);
    $("breakeven").textContent = d.breakEvenUnits;
    [[$("profit"), d.profit], [$("margin"), d.margin], [$("roi"), d.roi]]
      .forEach(([element, value]) => setMetricColor(element, value));

    DecisionInsights.render($("decisionAdvice"), $("status"), latestDecisionReport);
  }

  function setMetricColor(element, value) {
    if (!element) return;
    element.classList.remove("positive", "negative", "caution");
    const number = Number(value);
    element.classList.add(!Number.isFinite(number) || number === 0
      ? "caution"
      : number > 0 ? "positive" : "negative");
  }

  function renderEmpty() {
    ["revenue","totalCosts","profit","costPerUnit","profitPerUnit","margin","roi","breakeven"]
      .forEach(id => {
        const element = $(id);
        if (!element) return;
        element.textContent = "—";
        element.classList.remove("positive", "negative", "caution");
      });
    $("status").textContent = "—";
    $("status").className = "";
    delete $("status").dataset.riskLevel;
    $("decisionAdvice").textContent = "";
  }

  /* ================= ACTIONS ================= */
  function resetAll() {
    document.querySelectorAll(".input-section input:not(#mfg-project-name)").forEach(i => i.value = "");
    if ($("mfg-project-name")) $("mfg-project-name").value = "";
    latestData = null;
    latestInputs = null;
    latestDecisionReport = null;
    renderEmpty();
  }

  async function saveDeal() {
    if (!latestData) return alert("Run calculation first");
    const token = localStorage.getItem("token");
    const clientNameValue = getProjectName();
    const payload = {
      type: "manufacturing",
      clientName: clientNameValue,
      inputs: getInputs(),
      results: latestData
    };

    const res = await fetch(`${API_BASE}/api/saved-deals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) alert("Deal saved successfully!");
  }

  async function shareDeal() {
    if (!latestData) return alert("Run calculation first");

    const token = localStorage.getItem("token");
    const projectName = getProjectName();

    // 1. Construct the payload to match the backend SharedDealSchema
    const payload = {
      shareId: "share_" + Math.random().toString(36).substring(2, 9),
      type: "manufacturing",
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.roi,
        status: latestData.status,
        action: latestData.action,
        revenue: latestData.revenue,
        totalCosts: latestData.totalCosts,
        costPerUnit: latestData.costPerUnit,
        breakEvenUnits: latestData.breakEvenUnits
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

      // 2. Identify the final ID from the server response
      const finalId = data.shareId || data.id || data._id;

      // 3. Build the clean root URL for Vercel
      const shareUrl = `${window.location.origin}/share.html?id=${finalId}`;

      const shareMessage =
        `⚙️ Manufacturing Profitability Analysis: ${projectName}\n` +
        `View full analysis results here:\n${shareUrl}\n\n` +
        `Generated by Sandile SystemsWorks`;

      // 4. Trigger the native share menu or clipboard fallback
      if (navigator.share) {
        await navigator.share({
          title: 'Manufacturing Analysis Report',
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

  function exportManufacturingCSV() {
    if (!latestData) return alert("Run calculation first");
    const i = getInputs();
    const d = latestData;
    const rows = [
      ["Field", "Value"],
      ["Units", i.units],
      ["Price", i.price],
      ["Profit", d.profit],
      ["Margin %", d.margin],
      ["ROI %", d.roi],
      ["Break-even Units", d.breakEvenUnits]
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manufacturing-report.csv";
    a.click();
  }

  async function exportManufacturingReport() {
    if (!latestData) return alert("Run calculation first");

    const projectName = getProjectName();
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    try {
      await generateManufacturingPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("The manufacturing PDF report could not be generated. Please try again.");
    }
  }

  function generateManufacturingPdf(projectName, dateStr) {
    const i = getInputs();
    const d = latestData;
    return window.SandileReportPdf.download({
      projectName,
      reportTitle: "Manufacturing Intelligence & Profitability Report",
      date: dateStr,
      sections: [
        {
          title: "Production Inputs",
          rows: [
            ["Units", i.units],
            ["Selling price per unit", money(i.price)],
            ["Material cost per unit", money(i.material)],
            ["Labor cost", money(i.labor)],
            ["Fixed costs", money(i.fixed)],
            ["Operational costs", money(i.operational)]
          ]
        },
        {
          title: "Calculated Results",
          rows: [
            ["Revenue", money(d.revenue)],
            ["Total costs", money(d.totalCosts)],
            ["Profit", money(d.profit)],
            ["Margin", percent(d.margin)],
            ["ROI", percent(d.roi)],
            ["Cost per unit", money(d.costPerUnit)],
            ["Profit per unit", money(d.profitPerUnit)],
            ["Break-even units", d.breakEvenUnits],
            ["Decision", d.status],
            ["Advice", d.action]
          ]
        }
      ],
      filename: projectName || "manufacturing"
    });
  }

  function hydrateEdit() {
    const compareScenario = window.DealCompare?.getEditingScenario("manufacturing");
    if (compareScenario) {
      const i = compareScenario.inputs || {};
      $("mfg-project-name").value = compareScenario.name || "";
      $("mfg-units").value = i.units ?? "";
      $("mfg-price").value = i.price ?? "";
      $("mfg-material").value = i.material ?? "";
      $("mfg-labor").value = i.labor ?? "";
      $("mfg-fixed").value = i.fixed ?? "";
      $("mfg-operational").value = i.operational ?? "";
      $("compareBtn").querySelector("span").textContent = "Update Compare";
      return;
    }

    const edit = localStorage.getItem("editDeal");
    if (!edit) return;
    const d = JSON.parse(edit);
    if (d.type !== "manufacturing") return;
    const i = d.inputs || {};
    $("mfg-project-name").value = d.clientName || d.name || "";
    $("mfg-units").value = i.units || "";
    $("mfg-price").value = i.price || "";
    $("mfg-material").value = i.material || "";
    $("mfg-labor").value = i.labor || "";
    $("mfg-fixed").value = i.fixed || "";
    $("mfg-operational").value = i.operational || "";
    localStorage.removeItem("editDeal");
    setTimeout(runManufacturing, 100);
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".input-section input:not(#mfg-project-name)").forEach(input => {
      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runManufacturing, 250);
      });
    });

    window.ButtonLoading.bind($("resetBtn"), resetAll);
    window.ButtonLoading.bind($("saveDealBtn"), saveDeal);
    window.ButtonLoading.bind($("shareBtn"), shareDeal);
    window.ButtonLoading.bind($("compareBtn"), addToCompare);
    window.ButtonLoading.bind($("exportCsvBtn"), exportManufacturingCSV);
    window.ButtonLoading.bind($("exportReportBtn"), exportManufacturingReport);

    hydrateEdit();
    runManufacturing();
  });
})();