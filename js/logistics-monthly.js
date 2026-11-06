/* =====================================================
   MONTHLY OPERATIONS CALCULATOR
===================================================== */

let latestMonthlyInputs = null;
let latestMonthlyResults = null;

async function runMonthly() {

    const elShipments = $("log-shipments");
    if (!elShipments) return;

    const inputs = {
        shipments: FormattedNumberInput.getNumber(elShipments),
        revenuePer: FormattedNumberInput.getNumber($("log-revenue")),
        fuel: FormattedNumberInput.getNumber($("log-fuel")),
        labor: FormattedNumberInput.getNumber($("log-labor")),
        maintenance: FormattedNumberInput.getNumber($("log-maintenance")),
        fixed: FormattedNumberInput.getNumber($("log-fixed"))
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
    setText("log-margin", percent(data.margin));
    setText("log-roi", percent(data.roi));
    setText("log-break-even-quote", money(data.costPerShipment));
    setText("log-profit-run-rate", `${money(data.profit)} / month`);
    setText("log-annual-profit", money(data.annualProfit));
    setDecisionBanner("log-status", "log-advice", decision.status, decision.advice, decision.riskLevel, data.profit);

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
        "log-profit-per-shipment",
        money(data.profitPerShipment)
    );

    /* ==========================
       DECISION ENGINE
    ========================== */

    setText("log-risk-level", decision.riskLevel || "—");
    setText("log-safety", decision.safetyStatus || "—");
    setText(
        "log-recommended-price",
        money(decision.recommendedPricePerShipment || 0)
    );
    const steps = data.steps || [];
    const riskStep = steps.find(step => step.step === "Final Risk Assessment");
    const fuelImpact = Number(inputs.fuel) * 0.1;
    renderLogisticsInsights("operations-insights", {
        profitability: [
            ...(data.financialSummary || []),
            ...(data.profitability || [])
        ],
        costs: [
            ...(data.costAnalysis || []),
            {
                title: "Fuel Cost Sensitivity",
                message: inputs.fuel > 0
                    ? `A 10% fuel-cost increase adds ${money(fuelImpact)} to monthly costs and reduces profit by the same amount.`
                    : "Enter monthly fuel costs to calculate the impact of a fuel-price increase."
            }
        ],
        operations: [
            ...(data.priorityActions || []).map((message, index) => ({
                title: `Priority Action ${index + 1}`,
                message
            })),
            ...(riskStep ? [riskStep] : []),
            ...steps.filter(step => step.step === "Profit Margin Check")
        ],
        growth: [
            ...(data.pricingStrategy || []),
            ...(data.breakEvenAnalysis || []),
            ...(data.annualOutlook || [])
        ]
    });

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
