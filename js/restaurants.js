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

  const percent = (v) => {
    const n = Number(v) || 0;
    // Handle both 0.15 and 15 formats
    const val = Math.abs(n) <= 1 ? n * 100 : n;
    return val.toFixed(2) + "%";
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

    latestData = data;

    // UI Updates
    $("dailyCovers").textContent = data.dailyCovers ?? 0;
    $("revenue").textContent = money(data.monthlyRevenue);
    $("foodCost").textContent = money(data.foodCost);
    $("totalCosts").textContent = money(data.totalCosts);
    $("profit").textContent = money(data.profit);
    $("margin").textContent = percent(data.margin);
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

    $("profit").className = `output-value ${data.profit >= 0 ? "profit-positive" : "profit-negative"}`;
    $("margin").className = `output-value ${data.margin < 10 ? "profit-negative" : data.margin < 20 ? "margin-medium" : "margin-strong"}`;

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
    document.querySelectorAll(".input-section input").forEach(i => i.value = "");
    latestData = null;
    [
      "dailyCovers","revenue","foodCost","totalCosts","ratio",
      "profit","margin","profitCover","monthly","annual","breakeven"
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
    const payload = {
      type: "restaurant",
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
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
    const projectName = "Restaurant Operations Analysis";

    // 1. Construct the payload to match the backend SharedDealSchema
    const payload = {
      shareId: "share_" + Math.random().toString(36).substring(2, 9),
      type: "restaurant",
      inputs: getInputs(),
      results: {
        profit: latestData.profit,
        margin: latestData.margin,
        roi: latestData.margin,
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

  function exportCSV() {
    if (!latestData) return alert("Run calculation first");
    const i = getInputs();
    const rows = [
      ["Field", "Value"],
      ["Monthly Revenue", latestData.monthlyRevenue],
      ["Profit", latestData.profit],
      ["Margin", latestData.margin],
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
  function exportReport() {
    if (!latestData) return alert("Run calculation first");

    // 1. Fill in the print-only details
    const projectName = "Restaurant Analysis";
    const dateStr = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if ($("print-project-name")) $("print-project-name").textContent = projectName;
    if ($("print-date")) $("print-date").textContent = dateStr;

    // 2. Trigger the Print Dialog
    window.print();
  }

  /* ================= INIT ================= */
  document.addEventListener("DOMContentLoaded", () => {
    // Input Listeners
    document.querySelectorAll(".input-section input").forEach(i => {
      i.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runRestaurant, 300);
      });
    });

    // Button Listeners
    $("resetBtn")?.addEventListener("click", resetAll);
    $("saveDealBtn")?.addEventListener("click", saveDeal);
    $("shareBtn")?.addEventListener("click", shareDeal);
    $("exportCsvBtn")?.addEventListener("click", exportCSV);
    $("exportReportBtn")?.addEventListener("click", exportReport);

    // Load Edit Mode
    const editData = localStorage.getItem("editDeal");
    if (editData) {
      const d = JSON.parse(editData);
      if (d.type === "restaurant") {
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
  });
})();