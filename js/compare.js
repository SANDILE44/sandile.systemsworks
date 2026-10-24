(() => {
  const STORAGE_KEY = "systemsworksCompareScenarios";
  const MAX_SCENARIOS = 3;
  const calculatorPages = {
    consulting: "industry-consulting.html",
    construction: "industry-construction.html",
    manufacturing: "industry-manufacturing.html",
    restaurant: "industry-restaurants.html"
  };

  function readScenarios() {
    try {
      const scenarios = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(scenarios)
        ? scenarios.filter((scenario) =>
          scenario &&
          typeof scenario.id === "string" &&
          calculatorPages[scenario.type] &&
          scenario.inputs &&
          scenario.results
        ).slice(0, MAX_SCENARIOS)
        : [];
    } catch (error) {
      console.error("Could not read comparison scenarios:", error);
      return [];
    }
  }

  function writeScenarios(scenarios) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
      return true;
    } catch (error) {
      console.error("Could not save comparison scenarios:", error);
      alert("Your browser could not save the comparison. Check available storage and try again.");
      return false;
    }
  }

  function getScenario(id) {
    return readScenarios().find((scenario) => scenario.id === id) || null;
  }

  function getEditingScenario(type) {
    const id = new URLSearchParams(window.location.search).get("compareScenario");
    if (!id) return null;

    const scenario = getScenario(id);
    if (!scenario || scenario.type !== type) {
      alert("That comparison scenario could not be found. It may have been removed.");
      return null;
    }
    return scenario;
  }

  function addCurrentScenario({ type, name, inputs, results, calculatedInputs }) {
    if (!calculatorPages[type]) {
      alert("This calculator cannot be added to comparison yet.");
      return false;
    }

    if (
      !results ||
      results.profit === undefined ||
      results.profit === null ||
      results.profit === "" ||
      !Number.isFinite(Number(results.profit))
    ) {
      alert("Run a valid calculation before adding it to compare.");
      return false;
    }

    if (JSON.stringify(inputs) !== JSON.stringify(calculatedInputs)) {
      alert("Your latest input changes are still being calculated. Please wait, then add this scenario.");
      return false;
    }

    const scenarios = readScenarios();
    const editId = new URLSearchParams(window.location.search).get("compareScenario");
    const editingIndex = editId
      ? scenarios.findIndex((scenario) => scenario.id === editId && scenario.type === type)
      : -1;

    if (editId && editingIndex < 0) {
      alert("This comparison scenario no longer exists. Add it as a new scenario instead.");
      return false;
    }

    if (editingIndex >= 0) {
      scenarios[editingIndex] = {
        ...scenarios[editingIndex],
        name: name.trim() || scenarios[editingIndex].name,
        inputs,
        results,
        updatedAt: new Date().toISOString()
      };
    } else {
      if (scenarios.length >= MAX_SCENARIOS) {
        alert("You can compare up to three scenarios. Remove one from the compare page to add another.");
        return false;
      }

      if (scenarios.some((scenario) => scenario.type !== type)) {
        alert("Compare scenarios from the same industry. Clear the current comparison to start another tool.");
        return false;
      }

      scenarios.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        name: name.trim() || `${type[0].toUpperCase()}${type.slice(1)} scenario`,
        inputs,
        results,
        createdAt: new Date().toISOString()
      });
    }

    return writeScenarios(scenarios);
  }

  function initComparePage() {
    const root = document.getElementById("compare-content");
    if (!root) return;

    const labels = {
      consulting: "Consulting",
      construction: "Construction",
      manufacturing: "Manufacturing",
      restaurant: "Restaurant"
    };

    const inputLabels = {
      consulting: {
        hours: ["Project hours", "number"],
        rate: ["Hourly rate", "money"],
        expenses: ["Project expenses", "money"],
        labor: ["Labor costs", "money"],
        fixed: ["Fixed costs", "money"],
        discountPct: ["Discount", "percent"],
        otHours: ["Overtime hours", "number"],
        otRate: ["Overtime rate", "money"],
        variableCosts: ["Variable costs", "money"],
        contingencyPct: ["Contingency", "percent"]
      },
      construction: {
        value: ["Contract value", "money"],
        material: ["Material cost", "money"],
        laborMonthly: ["Monthly labor", "money"],
        equipmentMonthly: ["Monthly equipment", "money"],
        fixedMonthly: ["Monthly fixed costs", "money"],
        months: ["Duration (months)", "number"]
      },
      manufacturing: {
        units: ["Units produced", "number"],
        price: ["Selling price per unit", "money"],
        material: ["Material cost per unit", "money"],
        labor: ["Labor costs", "money"],
        fixed: ["Fixed costs", "money"],
        operational: ["Operational costs", "money"]
      },
      restaurant: {
        tables: ["Tables", "number"],
        coversPerTable: ["Covers per table", "number"],
        avgCheck: ["Average check", "money"],
        foodPct: ["Food cost", "percent"],
        labor: ["Labor costs", "money"],
        fixed: ["Fixed costs", "money"],
        days: ["Operating days", "number"]
      }
    };

    const metricFields = {
      consulting: [
        ["profit", "Net profit", "money"],
        ["totalRevenue", "Total revenue", "money"],
        ["totalCosts", "Total costs", "money"],
        ["margin", "Profit margin", "percent"],
        ["roi", "ROI", "percent"],
        ["profitPerHour", "Profit per hour", "money"],
        ["breakevenHours", "Break-even hours", "number"]
      ],
      construction: [
        ["profit", "Net profit", "money"],
        ["totalCosts", "Total costs", "money"],
        ["margin", "Profit margin", "percent"],
        ["roi", "ROI", "percent"],
        ["breakEvenValue", "Break-even value", "money"],
        ["monthlyProfit", "Monthly profit", "money"],
        ["annualProfit", "Annual profit", "money"]
      ],
      manufacturing: [
        ["profit", "Net profit", "money"],
        ["revenue", "Revenue", "money"],
        ["totalCosts", "Total costs", "money"],
        ["margin", "Profit margin", "percent"],
        ["roi", "ROI", "percent"],
        ["costPerUnit", "Cost per unit", "money"],
        ["profitPerUnit", "Profit per unit", "money"],
        ["breakEvenUnits", "Break-even units", "number"]
      ],
      restaurant: [
        ["profit", "Net profit", "money"],
        ["monthlyRevenue", "Monthly revenue", "money"],
        ["totalCosts", "Total costs", "money"],
        ["margin", "Profit margin", "percent"],
        ["dailyCovers", "Daily covers", "number"],
        ["breakevenCovers", "Break-even covers", "number"],
        ["foodCost", "Food cost", "money"],
        ["monthlyProfit", "Monthly profit", "money"],
        ["annualProfit", "Annual profit", "money"],
        ["profitPerCover", "Profit per cover", "money"],
        ["costRatio", "Cost ratio", "percent"]
      ]
    };

    const escapeHTML = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);

    const formatValue = (value, format) => {
      if (value === undefined || value === null || value === "") return "—";
      if (format === "text") return escapeHTML(value);

      const number = Number(value);
      if (!Number.isFinite(number)) return escapeHTML(value);
      const formatted = number.toLocaleString(undefined, {
        minimumFractionDigits: format === "number" ? 0 : 2,
        maximumFractionDigits: 2
      });

      if (format === "money") return `R ${formatted}`;
      if (format === "percent") return `${formatted}%`;
      return formatted;
    };

    function render() {
      const scenarios = readScenarios();
      const count = document.getElementById("compare-count");
      const clearButton = document.getElementById("clear-comparison");
      if (count) count.textContent = `${scenarios.length} of ${MAX_SCENARIOS} scenarios`;
      if (clearButton) clearButton.hidden = scenarios.length === 0;

      if (!scenarios.length) {
        root.innerHTML = `
          <section class="compare-empty">
            <span class="empty-icon" aria-hidden="true">+</span>
            <h2>Your comparison starts here</h2>
            <p>Add a calculated scenario from any of the four tools. Then duplicate it to test another set of assumptions side by side.</p>
            <div class="tool-links">
              ${Object.entries(calculatorPages).map(([type, page]) =>
                `<a class="compare-button secondary" href="${page}">Open ${labels[type]} tool</a>`
              ).join("")}
            </div>
          </section>
        `;
        return;
      }

      const type = scenarios[0].type;
      const metrics = metricFields[type];
      const visibleMetrics = metrics.filter(([key]) =>
        scenarios.some((scenario) => scenario.results[key] !== undefined && scenario.results[key] !== null)
      );

      root.innerHTML = `
        <section class="comparison-panel">
          <div class="table-scroll">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Performance metric</th>
                  ${scenarios.map((scenario, index) => `
                    <th scope="col">
                      <span class="scenario-number">Scenario ${index + 1}</span>
                      <input class="scenario-name" type="text" maxlength="80" aria-label="Scenario ${index + 1} name" data-rename="${escapeHTML(scenario.id)}" value="${escapeHTML(scenario.name)}">
                    </th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${visibleMetrics.map(([key, label, format]) => `
                  <tr class="${key === "profit" ? "highlight-row" : ""}">
                    <th scope="row">${escapeHTML(label)}</th>
                    ${scenarios.map((scenario) => `
                      <td>${formatValue(scenario.results[key], format)}</td>
                    `).join("")}
                  </tr>
                `).join("")}
                <tr>
                  <th scope="row">Decision</th>
                  ${scenarios.map((scenario) => `
                    <td>${formatValue(scenario.results.decision || scenario.results.status, "text")}</td>
                  `).join("")}
                </tr>
                <tr>
                  <th scope="row">Risk level</th>
                  ${scenarios.map((scenario) => `
                    <td>${formatValue(scenario.results.riskLevel, "text")}</td>
                  `).join("")}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="scenario-grid" aria-label="Scenario assumptions and actions">
          ${scenarios.map((scenario, index) => {
            const fields = inputLabels[type] || {};
            const assumptions = Object.entries(fields)
              .filter(([key]) => scenario.inputs[key] !== undefined && scenario.inputs[key] !== null && scenario.inputs[key] !== "")
              .map(([key, [label, format]]) => `
                <div class="assumption-row">
                  <span>${escapeHTML(label)}</span>
                  <strong>${formatValue(scenario.inputs[key], format)}</strong>
                </div>
              `).join("");

            return `
              <article class="scenario-card">
                <div class="scenario-card-heading">
                  <span class="scenario-number">Scenario ${index + 1}</span>
                  <h2>${escapeHTML(scenario.name)}</h2>
                </div>
                <details>
                  <summary>View assumptions</summary>
                  <div class="assumptions-list">${assumptions || "<p>No assumptions were saved.</p>"}</div>
                </details>
                <div class="scenario-actions">
                  <button class="compare-button primary" type="button" data-edit="${escapeHTML(scenario.id)}">Edit inputs</button>
                  <button class="compare-button secondary" type="button" data-duplicate="${escapeHTML(scenario.id)}">Duplicate</button>
                  <button class="compare-button remove" type="button" data-remove="${escapeHTML(scenario.id)}">Remove</button>
                </div>
              </article>
            `;
          }).join("")}
        </section>
        ${scenarios.length < MAX_SCENARIOS ? `
          <section class="add-scenario-panel">
            <p>${MAX_SCENARIOS - scenarios.length} comparison slot${MAX_SCENARIOS - scenarios.length === 1 ? "" : "s"} remaining</p>
            <a class="compare-button secondary" href="${calculatorPages[type]}">Add another ${labels[type]} scenario</a>
          </section>
        ` : ""}
      `;
    }

    root.addEventListener("change", (event) => {
      const input = event.target.closest("[data-rename]");
      if (!input) return;
      const scenarios = readScenarios();
      const scenario = scenarios.find((item) => item.id === input.dataset.rename);
      if (!scenario) return;
      scenario.name = input.value.trim() || "Untitled scenario";
      if (writeScenarios(scenarios)) render();
    });

    root.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit]");
      const duplicateButton = event.target.closest("[data-duplicate]");
      const removeButton = event.target.closest("[data-remove]");

      if (editButton) {
        const scenario = getScenario(editButton.dataset.edit);
        if (scenario) {
          window.location.href = `${calculatorPages[scenario.type]}?compareScenario=${encodeURIComponent(scenario.id)}`;
        }
      }

      if (duplicateButton) {
        const scenarios = readScenarios();
        const original = scenarios.find((item) => item.id === duplicateButton.dataset.duplicate);
        if (!original) return;
        if (scenarios.length >= MAX_SCENARIOS) {
          alert("You can compare up to three scenarios. Remove one before duplicating.");
          return;
        }
        scenarios.push({
          ...original,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: `${original.name} (Copy)`,
          inputs: { ...original.inputs },
          results: { ...original.results },
          createdAt: new Date().toISOString()
        });
        if (writeScenarios(scenarios)) render();
      }

      if (removeButton) {
        const scenarios = readScenarios().filter((item) => item.id !== removeButton.dataset.remove);
        if (writeScenarios(scenarios)) render();
      }
    });

    document.getElementById("clear-comparison")?.addEventListener("click", () => {
      if (!confirm("Remove all scenarios from this comparison?")) return;
      if (writeScenarios([])) render();
    });

    render();
  }

  window.DealCompare = {
    addCurrentScenario,
    getEditingScenario,
    getScenario
  };

  initComparePage();
})();
