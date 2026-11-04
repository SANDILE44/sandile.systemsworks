/* =====================================================
   MONTHLY OPERATIONS CALCULATOR
===================================================== */

let latestMonthlyInputs = null;
let latestMonthlyResults = null;

async function runMonthly() {

    const elShipments = $("log-shipments");
    if (!elShipments) return;

    const inputs = {
        shipments: parseFloat(elShipments.value) || 0,
        revenuePer: parseFloat($("log-revenue")?.value) || 0,
        fuel: parseFloat($("log-fuel")?.value) || 0,
        labor: parseFloat($("log-labor")?.value) || 0,
        maintenance: parseFloat($("log-maintenance")?.value) || 0,
        fixed: parseFloat($("log-fixed")?.value) || 0
    };

    latestMonthlyInputs = null;
    latestMonthlyResults = null;
    const data = await apiPost(
        "/api/calculators/logistics/business",
        inputs
    );

    if (!data) return;
    latestMonthlyInputs = { ...inputs };
    latestMonthlyResults = data;

    const decision = data.decision || {};

    /* ==========================
       FINANCIAL OVERVIEW
    ========================== */

    setText("log-total-revenue", money(data.totalRevenue));
    setText("log-total-costs", money(data.totalCosts));
    setText("log-profit", money(data.profit));
    setText("log-status", decision.status || "—");
    setText("log-annual-profit", money(data.annualProfit));

    /* ==========================
       PER SHIPMENT
    ========================== */

    setText(
        "log-shipments-output",
        data.shipments
    );

    setText(
        "log-revenue-per-shipment",
        money(inputs.revenuePer)
    );

    setText(
        "log-per-shipment",
        money(data.costPerShipment)
    );

    setText(
        "log-profit-per-shipment",
        money(data.profitPerShipment)
    );

    /* ==========================
       COST BREAKDOWN
    ========================== */

    setText("log-fuel-pct", percent(data.fuelPercent));
    setText("log-labor-pct", percent(data.laborPercent));
    setText("log-maintenance-pct", percent(data.maintenancePercent));
    setText("log-fixed-pct", percent(data.fixedPercent));

    /* ==========================
       DECISION ENGINE
    ========================== */

    setText("log-risk-level", decision.riskLevel || "—");
    setText("log-safety", decision.safetyStatus || "—");
    setText(
        "log-recommended-price",
        money(decision.recommendedPricePerShipment || 0)
    );
    setText("log-advice", decision.advice || "");

    /* ==========================
       FINANCIAL SUMMARY
    ========================== */

    if (typeof renderCards === "function") {
        renderCards(
            "financial-summary",
            data.financialSummary || []
        );
    }

    /* ==========================
       PROFITABILITY
    ========================== */

    if (typeof renderCards === "function") {
        renderCards(
            "profitability",
            data.profitability || []
        );
    }

    /* ==========================
       DROPDOWN SECTIONS
    ========================== */

    if (typeof renderAccordion === "function") {

        renderAccordion(
            "priority-actions",
            data.priorityActions || []
        );

        renderAccordion(
            "cost-analysis",
            data.costAnalysis || []
        );

        renderAccordion(
            "pricing-strategy",
            data.pricingStrategy || []
        );

        renderAccordion(
            "break-even-analysis",
            data.breakEvenAnalysis || []
        );

        renderAccordion(
            "annual-outlook",
            data.annualOutlook || []
        );

    }

    /* ==========================
       STEP BY STEP GUIDANCE
    ========================== */

    if (typeof renderSteps === "function") {

        renderSteps(
            "log-steps",
            data.steps || []
        );

    }

    /* ==========================
       FLAGS (OPTIONAL)
    ========================== */

    if (data.flags) {

        console.log("Calculator Flags:", data.flags);

    }

    /* ==========================
       COLOURING
    ========================== */

    setClass(
        $("log-profit"),
        data.profit >= 0
            ? "profit-positive"
            : "profit-negative"
    );

    if (decision.riskLevel) {

        setClass(
            $("log-risk-level"),
            `risk-${decision.riskLevel
                .toLowerCase()
                .replace(/\s+/g, "-")}`
        );

    }

    if (decision.safetyStatus) {

        setClass(
            $("log-safety"),
            `safety-${decision.safetyStatus
                .toLowerCase()
                .replace(/\s+/g, "-")}`
        );

    }

}

document.addEventListener("DOMContentLoaded", () => {
    bindLogisticsActions("logistics-operations", {
        name: "Monthly logistics operations",
        save: "saveOperationsBtn",
        share: "shareOperationsBtn",
        compare: "compareOperationsBtn",
        csv: "exportOperationsCsvBtn",
        report: "exportOperationsReportBtn",
        inputMap: {
            shipments: "log-shipments",
            revenuePer: "log-revenue",
            fuel: "log-fuel",
            labor: "log-labor",
            maintenance: "log-maintenance",
            fixed: "log-fixed"
        }
    }, () => ({
        inputs: latestMonthlyInputs,
        results: latestMonthlyResults
    }));
    hydrateLogisticsEdit("logistics-operations", {
        shipments: "log-shipments",
        revenuePer: "log-revenue",
        fuel: "log-fuel",
        labor: "log-labor",
        maintenance: "log-maintenance",
        fixed: "log-fixed"
    }, runMonthly);
});
