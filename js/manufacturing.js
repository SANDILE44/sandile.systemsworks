(() => {
  const $ = (id) => document.getElementById(id);
  const API_BASE = "https://sandile-systemsworks-saas-backend-2.onrender.com";

  let debounceTimer;
  let latestData = null;
  let latestInputs = null;

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
      units: +$("mfg-units")?.value || 0,
      price: +$("mfg-price")?.value || 0,
      material: +$("mfg-material")?.value || 0,
      labor: +$("mfg-labor")?.value || 0,
      fixed: +$("mfg-fixed")?.value || 0,
      operational: +$("mfg-operational")?.value || 0
    };
  }

  function addToCompare() {
    if (!latestData) return alert("Run calculation first.");
    const saved = window.DealCompare?.addCurrentScenario({
      type: "manufacturing",
      name: $("mfg-project-name")?.value || "Manufacturing scenario",
      inputs: getInputs(),
      calculatedInputs: latestInputs,
      results: latestData
    });
    if (saved) window.location.href = "compare.html";
  }

  /* ================= ENGINE ================= */
  function runManufacturing() {
    const i = getInputs();

    if (i.units <= 0 || i.price <= 0) {
      latestInputs = null;
      renderEmpty();
      return;
    }

    const revenue = i.units * i.price;
    const materialTotal = i.units * i.material;
    const totalCosts = materialTotal + i.labor + i.fixed + i.operational;
    const profit = revenue - totalCosts;

    const margin = safeDivide(profit, revenue) * 100;
    const roi = safeDivide(profit, totalCosts) * 100;

    const costPerUnit = safeDivide(totalCosts, i.units);
    const profitPerUnit = safeDivide(profit, i.units);

    const breakEvenUnits =
      (i.price - i.material) > 0
        ? Math.ceil((i.labor + i.fixed + i.operational) / (i.price - i.material))
        : 0;

    let status = "PROFIT";
    let action = "Healthy operation. Focus on scaling production.";

    if (profit <= 0) {
      status = "LOSS";
      action = "Costs exceed revenue — adjust unit pricing or reduce overhead.";
    } else if (margin < 10) {
      status = "RISK";
      action = "Thin margins detected — high risk if material costs fluctuate.";
    } else if (margin < 20) {
      status = "NEUTRAL";
      action = "Stable performance. Look for labor or material efficiencies.";
    }

    latestData = {
      revenue,
      totalCosts,
      profit,
      margin,
      roi,
      costPerUnit,
      profitPerUnit,
      breakEvenUnits,
      status,
      action,
      steps: [
        `Revenue generated from ${i.units} units at R${i.price} each.`,
        `Direct Material Costs totaled R${materialTotal.toFixed(2)}.`,
        `Total Overhead (Labor + Fixed + OpEx) is R${(i.labor + i.fixed + i.operational).toFixed(2)}.`,
        `You need to sell at least ${breakEvenUnits} units to cover all costs.`
      ]
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
    $("margin").textContent = percent(d.margin);
    $("roi").textContent = percent(d.roi);
    $("breakeven").textContent = d.breakEvenUnits;

    const status = $("status");
    status.textContent = d.status;
    $("decisionAdvice").textContent = d.action;

    status.className = ""; // clear
    if (d.status === "PROFIT") status.classList.add("profit");
    else if (d.status === "LOSS") status.classList.add("loss");
    else status.classList.add("neutral");

    // Render Steps
    const stepsContainer = $("stepsContainer");
    if (stepsContainer && d.steps) {
      stepsContainer.innerHTML = d.steps.map((s, idx) => `
        <div class="step">
          <strong>Step ${idx + 1}:</strong> ${s}
        </div>
      `).join("");
    }
  }

  function renderEmpty() {
    ["revenue","totalCosts","profit","costPerUnit","profitPerUnit","margin","roi","breakeven"]
      .forEach(id => $(id) && ($(id).textContent = "—"));
    $("status").textContent = "—";
    $("decisionAdvice").textContent = "";
    if ($("stepsContainer")) $("stepsContainer").innerHTML = "";
  }

  /* ================= ACTIONS ================= */
  function resetAll() {
    document.querySelectorAll(".input-section input:not(#mfg-project-name)").forEach(i => i.value = "");
    if ($("mfg-project-name")) $("mfg-project-name").value = "";
    latestData = null;
    latestInputs = null;
    renderEmpty();
  }

  async function saveDeal() {
    if (!latestData) return alert("Run calculation first");
    const token = localStorage.getItem("token");
    const clientNameValue = $("mfg-project-name")?.value || "Untitled Project";
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
    const projectName = $("mfg-project-name")?.value || "Manufacturing Profitability Analysis";

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

    const projectName = $("mfg-project-name")?.value.trim() || "Manufacturing Analysis";
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
        pdfScript.onload = () => generateManufacturingPdf(projectName, dateStr);
        pdfScript.onerror = () => window.print();
        document.head.appendChild(pdfScript);
        return;
      }

      generateManufacturingPdf(projectName, dateStr);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    }
  }

  function generateManufacturingPdf(projectName, dateStr) {
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
    doc.text("Project Intelligence & Profitability Report", margin, y + 18);
    doc.setTextColor(34, 197, 94);
    doc.text(projectName, margin, y + 38, { maxWidth: 515 });
    doc.setTextColor(148, 163, 184);
    doc.text(dateStr, margin, y + 56);

    doc.setDrawColor(0, 180, 216);
    doc.line(margin, y + 68, 555, y + 68);

    y = y + 108;
    const metrics = [
      ["Units", i.units],
      ["Selling price per unit", money(i.price)],
      ["Material cost per unit", money(i.material)],
      ["Labor cost", money(i.labor)],
      ["Fixed costs", money(i.fixed)],
      ["Operational costs", money(i.operational)],
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
    ];

    metrics.forEach(([label, value]) => {
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
      .replace(/^-|-$/g, "") || "manufacturing";
    doc.save(`${filename}-report.pdf`);
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

    $("resetBtn")?.addEventListener("click", resetAll);
    $("saveDealBtn")?.addEventListener("click", saveDeal);
    $("shareBtn")?.addEventListener("click", shareDeal);
    $("compareBtn")?.addEventListener("click", addToCompare);
    $("exportCsvBtn")?.addEventListener("click", exportManufacturingCSV);
    $("exportReportBtn")?.addEventListener("click", exportManufacturingReport);

    hydrateEdit();
    runManufacturing();
  });
})();