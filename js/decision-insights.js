(() => {
  const currency = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const MAX_MARGIN = 100;
  const MAX_ROI = 1000;

  const sectors = {
    consulting: {
      label: "Consulting",
      revenueLabel: "discounted project revenue",
      target: "Consulting projects should generally target 40-50% or higher net margins to account for delivery risk and overhead; that corresponds to roughly 67-100% ROI on costs.",
      highRiskBelow: 40,
      strongAt: 50
    },
    construction: {
      label: "Construction",
      revenueLabel: "contract value",
      target: "Construction projects should target at least 12-15% net margin to absorb overruns; margins below 12% are high risk. That target corresponds to roughly 14-18% ROI on costs.",
      highRiskBelow: 12,
      strongAt: 15
    },
    manufacturing: {
      label: "Manufacturing",
      revenueLabel: "production revenue",
      target: "Manufacturing should target 20-30% or higher net margin to account for batch waste, machine costs, and production variability; that corresponds to roughly 25-43% ROI on costs.",
      highRiskBelow: 20,
      strongAt: 30
    },
    restaurant: {
      label: "Restaurants",
      revenueLabel: "monthly revenue",
      target: "Restaurants typically target 15-20% net profit margin (roughly 18-25% ROI on costs), with food/beverage COGS around 28-35% and labor around 25-35% of revenue.",
      highRiskBelow: 10,
      healthyAt: 15,
      strongAt: 20
    }
  };

  const finiteNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  const money = value => `R${currency.format(Math.abs(value))}`;
  const percent = value => `${value.toFixed(1)}%`;

  function analyze(options) {
    const sector = sectors[options.industry];
    if (!sector) throw new Error(`Unknown decision insight industry: ${options.industry}`);

    const revenue = Math.max(0, finiteNumber(options.revenue));
    const costs = Math.max(0, finiteNumber(options.costs));
    const profit = Number.isFinite(Number(options.profit))
      ? finiteNumber(options.profit)
      : revenue - costs;
    const hasRevenue = revenue > 0;
    const hasCosts = costs > 0;
    const margin = hasRevenue ? clamp((profit / revenue) * 100, MAX_MARGIN) : null;
    const roi = hasCosts ? clamp((profit / costs) * 100, MAX_ROI) : null;
    const lines = [];
    let recommendation;
    let level;
    let restaurantCostRisk = false;

    if (!hasRevenue && !hasCosts) {
      recommendation = "INSUFFICIENT DATA — ENTER REVENUE AND COSTS";
      level = "caution";
      lines.push("Enter positive revenue and cost assumptions to generate a reliable profitability decision.");
    } else {
      lines.push(
        `Total costs are ${money(costs)} against ${sector.revenueLabel} of ${money(revenue)}. ` +
        (profit >= 0
          ? `Projected net profit is ${money(profit)}.`
          : `Projected net loss is ${money(profit)}.`)
      );

      if (margin === null) {
        lines.push("Net margin is unavailable because revenue is zero; do not rely on percentage benchmarks until revenue is entered.");
      } else {
        lines.push(`Projected net margin is ${percent(margin)}. ${sector.target}`);
      }

      if (roi === null) {
        lines.push("ROI is unavailable because total costs are zero.");
      } else {
        lines.push(`Projected ROI on total costs is ${percent(roi)}.`);
      }

      if (profit < 0) {
        recommendation = "CRITICAL LOSS — DO NOT ACCEPT AT THIS PRICE";
        level = "danger";
      } else if (profit === 0) {
        recommendation = "NO PROFIT BUFFER — RENEGOTIATE BEFORE PROCEEDING";
        level = "caution";
      } else if (margin === null || margin < sector.highRiskBelow) {
        recommendation = "HIGH RISK — RENEGOTIATE PRICING OR REDUCE COSTS";
        level = "danger";
      } else if (margin < (sector.healthyAt ?? sector.strongAt)) {
        recommendation = "PROCEED WITH CAUTION — IMPROVE THE PROFIT BUFFER";
        level = "caution";
      } else if (margin < sector.strongAt) {
        recommendation = "ON TARGET — PROCEED AND MONITOR COSTS";
        level = "success";
      } else {
        recommendation = "STRONG PROJECT — GOOD TO PROCEED";
        level = "success";
      }
    }

    if (options.industry === "restaurant" && (hasRevenue || hasCosts)) {
      const foodCost = Math.max(0, finiteNumber(options.foodCost));
      const laborCost = Math.max(0, finiteNumber(options.laborCost));
      const foodPct = hasRevenue ? (foodCost / revenue) * 100 : null;
      const laborPct = hasRevenue ? (laborCost / revenue) * 100 : null;
      const ratioText = value => value === null ? "unavailable" : percent(clamp(value, MAX_MARGIN));
      const combinedPct = foodPct === null || laborPct === null ? null : foodPct + laborPct;
      restaurantCostRisk = (foodPct !== null && foodPct > 35) ||
        (laborPct !== null && laborPct > 35) ||
        (combinedPct !== null && combinedPct > 65);

      lines.push(
        `Food/beverage COGS are ${ratioText(foodPct)} of revenue ` +
        `(${foodPct === null ? "benchmark unavailable" : foodPct < 28 ? "below" : foodPct <= 35 ? "within" : "above"} the typical 28-35% range); ` +
        `labor is ${ratioText(laborPct)} ` +
        `(${laborPct === null ? "benchmark unavailable" : laborPct < 25 ? "below" : laborPct <= 35 ? "within" : "above"} the typical 25-35% range).`
      );
      lines.push(
        `Combined food/beverage and labor are ${ratioText(combinedPct)} of revenue, against a typical 55-65% combined range.`
      );
    }

    if (restaurantCostRisk && level !== "danger") {
      recommendation = "REVIEW COST MIX — REDUCE ABOVE-BENCHMARK FOOD OR LABOR COSTS";
      level = "caution";
    }
    lines.unshift(recommendation);

    return {
      revenue,
      costs,
      profit,
      margin,
      roi,
      recommendation,
      level,
      lines
    };
  }

  function render(container, status, report, backendDecision, backendRisk) {
    if (status) {
      status.textContent = backendDecision || report.recommendation;
      const tone = String(backendRisk || "").toLowerCase();
      status.className = tone === "high" ? "loss" : tone === "medium" ? "neutral" :
        tone === "low" ? "profit" : `decision-insights-status decision-insights-${report.level}`;
    }
    if (!container) return;

    const narrative = document.createElement("section");
    narrative.className = `decision-insights decision-insights-${report.level}`;
    const heading = document.createElement("strong");
    heading.textContent = "Decision Insights";
    narrative.appendChild(heading);

    report.lines.forEach(text => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      narrative.appendChild(paragraph);
    });

    container.replaceChildren(narrative);
  }

  window.DecisionInsights = { analyze, render };
})();
