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
        `Total costs are R${money(costs)} against monthly revenue of R${money(revenue)}. ` +
        (profit >= 0
          ? `Projected net profit is R${money(profit)}.`
          : `Projected net loss is R${money(profit)}.`)
      );
      lines.push(margin === null
        ? "Net margin is unavailable because revenue is zero; enter revenue before relying on percentage benchmarks."
        : `Projected net margin is ${margin.toFixed(1)}%. Restaurants typically target 15-20% net profit margin; food/beverage COGS should be 28-35% of revenue and labor 25-35%.`);
      lines.push(roi === null
        ? "ROI is unavailable because total costs are zero."
        : `Projected ROI on total costs is ${roi.toFixed(1)}%.`);

      if (profit < 0) {
        recommendation = "CRITICAL LOSS — DO NOT ACCEPT AT THIS PRICE";
        level = "danger";
      } else if (profit === 0) {
        recommendation = "NO PROFIT BUFFER — RENEGOTIATE BEFORE PROCEEDING";
        level = "caution";
      } else if (margin === null || margin < 10) {
        recommendation = "HIGH RISK — RENEGOTIATE PRICING OR REDUCE COSTS";
        level = "danger";
      } else if (margin < 15) {
        recommendation = "PROCEED WITH CAUTION — IMPROVE THE PROFIT BUFFER";
        level = "caution";
      } else if (margin < 20) {
        recommendation = "ON TARGET — PROCEED AND MONITOR COSTS";
        level = "success";
      } else {
        recommendation = "STRONG PROJECT — GOOD TO PROCEED";
        level = "success";
      }
    }

    if (hasRevenue || hasCosts) {
      const foodCost = Math.max(0, number(options.foodCost));
      const laborCost = Math.max(0, number(options.laborCost));
      const foodPct = hasRevenue ? foodCost / revenue * 100 : null;
      const laborPct = hasRevenue ? laborCost / revenue * 100 : null;
      const combinedPct = foodPct === null || laborPct === null ? null : foodPct + laborPct;
      const ratioText = value => value === null
        ? "unavailable"
        : `${Math.max(-100, Math.min(100, value)).toFixed(1)}%`;
      const costRisk = (foodPct !== null && foodPct > 35) ||
        (laborPct !== null && laborPct > 35) ||
        (combinedPct !== null && combinedPct > 65);

      lines.push(
        `Food/beverage COGS are ${ratioText(foodPct)} of revenue ` +
        `(${foodPct === null ? "benchmark unavailable" : foodPct < 28 ? "below" : foodPct <= 35 ? "within" : "above"} the typical 28-35% range); ` +
        `labor is ${ratioText(laborPct)} ` +
        `(${laborPct === null ? "benchmark unavailable" : laborPct < 25 ? "below" : laborPct <= 35 ? "within" : "above"} the typical 25-35% range).`
      );
      lines.push(`Combined food/beverage and labor are ${ratioText(combinedPct)} of revenue, against a typical 55-65% combined range.`);
      if (costRisk && level !== "danger") {
        recommendation = "REVIEW COST MIX — REDUCE ABOVE-BENCHMARK FOOD OR LABOR COSTS";
        level = "caution";
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
      options.status.className = tone === "danger" ? "loss" : tone === "caution" ? "neutral" : "profit";
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
      tables: FormattedNumberInput.getNumber($("tables")),
      coversPerTable: FormattedNumberInput.getNumber($("covers")),
      avgCheck: FormattedNumberInput.getNumber($("check")),
      foodPct: FormattedNumberInput.getNumber($("foodPercent")),
      labor: FormattedNumberInput.getNumber($("labor")),
      fixed: FormattedNumberInput.getNumber($("fixed")),
      days: FormattedNumberInput.getNumber($("days"))
    };
  }

  /* ================= MAIN CALCULATION ================= */
  async function runRestaurant() {
    const inputs = getInputs();
    
    const data = await api("/api/calculators/restaurant/operations", "POST", inputs);
    if (!data) return;

    const report = renderDecisionInsights({
      status: $("status"),
      container: $("decisionAdvice"),
      revenue: data.monthlyRevenue,
      costs: data.totalCosts,
      profit: data.profit,
      decision: data.decision,
      advice: data.advice,
      riskLevel: data.riskLevel,
      foodCost: data.foodCost,
      laborCost: inputs.labor
    });
    latestData = data;
    latestInputs = { ...inputs };

    // UI Updates
    $("dailyCovers").textContent = data.dailyCovers ?? 0;
    $("revenue").textContent = money(data.monthlyRevenue);
    $("foodCost").textContent = money(data.foodCost);
    $("totalCosts").textContent = money(data.totalCosts);
    $("profit").textContent = money(data.profit);
    $("margin").textContent = report.margin === null ? "—" : percent(report.margin);
    $("roi").textContent = report.roi === null ? "—" : percent(report.roi);
    $("breakeven").textContent = data.breakevenCovers ?? 0;
    $("profitCover").textContent = money(data.profitPerCover);
    $("monthly").textContent = money(data.monthlyProfit);
    $("annual").textContent = money(data.annualProfit);
    $("ratio").textContent = percent(data.costRatio);

    setMetricColor($("profit"), data.profit);
    setMetricColor($("margin"), report.margin);
    setMetricColor($("roi"), report.roi);
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

    try {
      await generateRestaurantPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("The restaurant PDF report could not be generated. Please try again.");
    }
  }

  function generateRestaurantPdf(projectName, dateStr) {
    const i = getInputs();
    const d = latestData;
    return window.SandileReportPdf.download({
      projectName,
      reportTitle: "Restaurant Intelligence & Profitability Report",
      date: dateStr,
      sections: [
        {
          title: "Restaurant Inputs",
          rows: [
            ["Tables", i.tables],
            ["Covers per table", i.coversPerTable],
            ["Average check", money(i.avgCheck)],
            ["Food cost", percent(i.foodPct)],
            ["Labor cost", money(i.labor)],
            ["Fixed costs", money(i.fixed)],
            ["Operating days", i.days]
          ]
        },
        {
          title: "Calculated Results",
          rows: [
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
          ]
        }
      ],
      filename: projectName || "restaurant"
    });
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