(() => {
  const $ = (id) => document.getElementById(id);
  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";

  let debounceTimer;
  let latestData = null;
  let latestInputs = null;

  function getProjectName() {
    return $("restaurant-project-name")?.value.trim() || "Restaurant project";
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

  const percent = (v) => {
    const n = Number(v) || 0;
    return n.toFixed(2) + "%";
  };

  /* ================= API UTILITY ================= */
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

      return res.ok ? await res.json() : null;
    } catch (err) {
      console.error("API error:", err);
      return null;
    }
  }

  /* ================= INPUTS ================= */
  function getInputs() {
    return {
      tables: +$("tables")?.value || 0,
      coversPerTable: +$("covers")?.value || 0,
      avgCheck: +$("check")?.value || 0,
      foodPct: +$("foodPercent")?.value || 0,
      labor: +$("labor")?.value || 0,
      fixed: +$("fixed")?.value || 0,
      days: +$("days")?.value || 0
    };
  }

  /* ================= MAIN CALCULATION ================= */
  async function runRestaurant() {
    const inputs = getInputs();
    
    // Only run if we have basic data
    if (inputs.tables <= 0 || inputs.avgCheck <= 0) return;

    const data = await api("/api/calculators/restaurant/operations", "POST", inputs);
    if (!data) return;

    const costs = Number(data.totalCosts) || 0;
    const roi = data.roi !== null && data.roi !== undefined && data.roi !== "" && Number.isFinite(Number(data.roi))
      ? Number(data.roi)
      : costs === 0 ? 0 : (Number(data.profit) || 0) / costs * 100;
    latestData = { ...data, roi };
    latestInputs = { ...inputs };

    // UI Updates
    $("dailyCovers").textContent = data.dailyCovers ?? 0;
    $("revenue").textContent = money(data.monthlyRevenue);
    $("foodCost").textContent = money(data.foodCost);
    $("totalCosts").textContent = money(data.totalCosts);
    $("profit").textContent = money(data.profit);
    $("margin").textContent = percent(data.margin);
    $("roi").textContent = percent(roi);
    $("breakeven").textContent = data.breakevenCovers ?? 0;
    $("profitCover").textContent = money(data.profitPerCover);
    $("monthly").textContent = money(data.monthlyProfit);
    $("annual").textContent = money(data.annualProfit);
    $("ratio").textContent = percent(data.costRatio);

    const status = $("status");
    const advice = $("decisionAdvice");

    status.textContent = data.decision || "—";
    advice.textContent = data.advice || "";

    // Dynamic Styling
    status.className = 
      data.riskLevel === "High" ? "loss" : 
      data.riskLevel === "Medium" ? "neutral" : "profit";

    setMetricColor($("profit"), data.profit);
    setMetricColor($("margin"), data.margin);
    setMetricColor($("roi"), roi);

    renderInsights(data.insights);
  }

  /* ================= INSIGHTS RENDERING ================= */
  function renderInsights(insights) {
    const container = $("stepsContainer");
    if (!container || !insights) return;

    const titles = {
      summary: "📊 Summary",
      profitability: "💰 Profitability",
      costs: "📉 Costs",
      operations: "⚙ Operations",
      growth: "🚀 Growth"
    };

    container.innerHTML = Object.entries(insights)
      .map(([key, items]) => {
        const content = items.map(i => `
          <div class="step">
            <strong>${i.title}</strong>
            <div>${i.message}</div>
          </div>
        `).join("");

        return `
          <div class="insight-group">
            <details>
              <summary>${titles[key] || key}</summary>
              <div style="margin-top:10px;">${content}</div>
            </details>
          </div>
        `;
      }).join("");
  }

  /* ================= ACTIONS ================= */
  function resetAll() {
    document.querySelectorAll(".input-section input:not(#restaurant-project-name)").forEach(i => i.value = "");
    if ($("restaurant-project-name")) $("restaurant-project-name").value = "";
    latestData = null;
    latestInputs = null;
    [
      "dailyCovers","revenue","foodCost","totalCosts","ratio",
      "profit","margin","roi","profitCover","monthly","annual","breakeven"
    ].forEach(id => {
      if ($(id)) {$(id).textContent = "—";
        $(id).className = "output-value";
      }
    });
    $("status").textContent = "—";
    $("status").className = "";
    $("decisionAdvice").textContent = "";
    $("stepsContainer").innerHTML = "";
  }

  async function saveDeal() {
    if (!latestData) return alert("Run calculation first");
    
    const editId = localStorage.getItem("editDealId");
    const clientNameValue = getProjectName();
    const payload = {
      type: "restaurant",
      clientName: clientNameValue,
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.roi,
        monthlyRevenue: latestData.monthlyRevenue
      }
    };

    const url = editId ? `/api/saved-deals/${editId}` : "/api/saved-deals";
    const method = editId ? "PUT" : "POST";

    const res = await api(url, method, payload);
    if (res) {
      alert(editId ? "Deal updated successfully" : "Deal saved successfully");
      if (editId) {
        localStorage.removeItem("editDeal");
        localStorage.removeItem("editDealId");
      }
    }
  }

  async function shareDeal() {
    if (!latestData) return alert("Run calculation first");

    const token = localStorage.getItem("token");
    const projectName = getProjectName();

    // 1. Construct the payload to match the backend SharedDealSchema
    const payload = {
      shareId: "share_" + Math.random().toString(36).substring(2, 9),
      type: "restaurant",
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.roi,
        status: latestData.decision,
        action: latestData.advice,
        dailyCovers: latestData.dailyCovers,
        monthlyRevenue: latestData.monthlyRevenue,
        breakEven: latestData.breakevenCovers
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
        `🍽️ Restaurant Operations Analysis: ${projectName}\n` +
        `View full analysis results here:\n${shareUrl}\n\n` +
        `Generated by Sandile SystemsWorks`;

      // 4. Trigger the native share menu or clipboard fallback
      if (navigator.share) {
        await navigator.share({
          title: 'Restaurant Analysis Report',
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
    if (!latestData) return alert("Run calculation first.");
    const saved = window.DealCompare?.addCurrentScenario({
      type: "restaurant",
      name: getProjectName(),
      inputs: getInputs(),
      calculatedInputs: latestInputs,
      results: latestData
    });
    if (saved) window.location.href = "compare.html";
  }

  function exportCSV() {
    if (!latestData) return alert("Run calculation first");
    const i = getInputs();
    const rows = [
      ["Field", "Value"],
      ["Monthly Revenue", latestData.monthlyRevenue],
      ["Profit", latestData.profit],
      ["Margin", latestData.margin],
      ["ROI", latestData.roi],
      ["Breakeven Covers", latestData.breakevenCovers]
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "restaurant-report.csv";
    a.click();
  }

  /* ================= EXPORT REPORT (PRINT) ================= */
  async function exportReport() {
    if (!latestData) return alert("Run calculation first");

    const projectName = getProjectName();
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
        pdfScript.onload = () => generateRestaurantPdf(projectName, dateStr);
        pdfScript.onerror = () => window.print();
        document.head.appendChild(pdfScript);
        return;
      }

      generateRestaurantPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    }
  }

  function generateRestaurantPdf(projectName, dateStr) {
    const { jsPDF } = window.jspdf;
    const i = getInputs();
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
    doc.text("Restaurant Intelligence & Profitability Report", margin, y + 18);
    doc.setTextColor(34, 197, 94);
    doc.text(projectName, margin, y + 38, { maxWidth: 515 });
    doc.setTextColor(148, 163, 184);
    doc.text(dateStr, margin, y + 56);
    doc.setDrawColor(0, 180, 216);
    doc.line(margin, y + 68, 555, y + 68);

    y = y + 108;
    const rows = [
      ["Tables", i.tables],
      ["Covers per table", i.coversPerTable],
      ["Average check", money(i.avgCheck)],
      ["Food cost %", percent(i.foodPct)],
      ["Labor cost", money(i.labor)],
      ["Fixed costs", money(i.fixed)],
      ["Operating days", i.days],
      ["Daily covers", d.dailyCovers ?? 0],
      ["Monthly revenue", money(d.monthlyRevenue)],
      ["Food cost", money(d.foodCost)],
      ["Total costs", money(d.totalCosts)],
      ["Profit", money(d.profit)],
      ["Margin", percent(d.margin)],
      ["ROI", percent(d.roi)],
      ["Break-even covers", d.breakevenCovers ?? 0],
      ["Profit per cover", money(d.profitPerCover)],
      ["Monthly profit", money(d.monthlyProfit)],
      ["Annual profit", money(d.annualProfit)],
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
      .replace(/^-|-$/g, "") || "restaurant";
    doc.save(`${filename}-report.pdf`);
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    // Input Listeners
    document.querySelectorAll(".input-section input:not(#restaurant-project-name)").forEach(i => {
      i.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runRestaurant, 300);
      });
    });

    // Button Listeners
    window.ButtonLoading.bind($("resetBtn"), resetAll);
    window.ButtonLoading.bind($("saveDealBtn"), saveDeal);
    window.ButtonLoading.bind($("shareBtn"), shareDeal);
    window.ButtonLoading.bind($("compareBtn"), addToCompare);
    window.ButtonLoading.bind($("exportCsvBtn"), exportCSV);
    window.ButtonLoading.bind($("exportReportBtn"), exportReport);

    // Load Edit Mode
    const compareScenario = window.DealCompare?.getEditingScenario("restaurant");
    if (compareScenario) {
      const i = compareScenario.inputs || {};
      $("restaurant-project-name").value = compareScenario.name || "";
      $("tables").value = i.tables ?? "";
      $("covers").value = i.coversPerTable ?? "";
      $("check").value = i.avgCheck ?? "";
      $("foodPercent").value = i.foodPct ?? "";
      $("labor").value = i.labor ?? "";
      $("fixed").value = i.fixed ?? "";
      $("days").value = i.days ?? "";
      $("compareBtn").querySelector("span").textContent = "Update Compare";
      runRestaurant();
    } else {
      const editData = localStorage.getItem("editDeal");
      if (editData) {
        const d = JSON.parse(editData);
        if (d.type === "restaurant") {
          $("restaurant-project-name").value = d.clientName || d.name || "";
          $("tables").value = d.inputs?.tables || "";
          $("covers").value = d.inputs?.coversPerTable || "";
          $("check").value = d.inputs?.avgCheck || "";
          $("foodPercent").value = d.inputs?.foodPct || "";
          $("labor").value = d.inputs?.labor || "";
          $("fixed").value = d.inputs?.fixed || "";
          $("days").value = d.inputs?.days || "";
          runRestaurant();
        }
      }
    }
  });
})();