/* =====================================================
   FREIGHT IMPORT / EXPORT CALCULATOR
===================================================== */

let latestFreightInputs = null;
let latestFreightResults = null;

async function runFreight() {

    const elQuote = $("freight-quote");
    if (!elQuote) return;

    const inputs = {

        quote: parseFloat(elQuote.value) || 0,

        cargoValue: parseFloat($("freight-cargo-value")?.value) || 0,
        insuranceRate: parseFloat($("freight-insurance-rate")?.value) || 0,

        freightCost: parseFloat($("freight-cost")?.value) || 0,
        fuelSurcharge: parseFloat($("freight-fuel-surcharge")?.value) || 0,

        dutyRate: parseFloat($("freight-duty-rate")?.value) || 0,
        customsFees: parseFloat($("freight-customs-fees")?.value) || 0,

        portFees: parseFloat($("freight-port-fees")?.value) || 0,
        handlingFees: parseFloat($("freight-handling-fees")?.value) || 0,

        inlandTransport: parseFloat($("freight-inland-transport")?.value) || 0,
        tolls: parseFloat($("freight-tolls")?.value) || 0,

        otherCosts: parseFloat($("freight-other-costs")?.value) || 0
    };

    latestFreightInputs = null;
    latestFreightResults = null;
    const data = await apiPost(
        "/api/calculators/logistics/freight",
        inputs
    );

    if (!data) return;
    latestFreightInputs = { ...inputs };
    latestFreightResults = data;

    /* ==========================
       RESULTS
    ========================== */

    setText("freight-insurance-cost", money(data.insuranceCost));
    setText("freight-duties", money(data.dutyCost));
    setText("freight-total-cost", money(data.totalCost));
    setText("freight-profit", money(data.profit));
    setText("freight-margin", percent(data.margin));
    setText("freight-roi", percent(data.totalCost > 0 ? (data.profit / data.totalCost) * 100 : 0));
    setText("freight-breakeven", money(data.breakEvenQuote));
    setText("freight-run-rate", money(data.profit));
    setText("freight-recommended-quote", money(data.recommendedQuote));
    setText("freight-risk", data.riskLevel || "—");
    setDecisionBanner("freight-decision", "freight-reason", data.decision, data.reason, data.riskLevel, data.profit);

    /* ==========================
       STYLING
    ========================== */

    setClass(
        $("freight-profit"),
        data.profit >= 0
            ? "profit-positive"
            : "profit-negative"
    );

    setClass(
        $("freight-margin"),
        data.margin >= 20
            ? "margin-strong"
            : data.margin >= 10
            ? "margin-medium"
            : "margin-low"
    );

    if (data.riskLevel) {

        setClass(
            $("freight-risk"),
            `freight-risk-${String(data.riskLevel)
                .toLowerCase()
                .replace(/\s+/g, "-")}`
        );

    }

    const steps = data.steps || [];
    const findStep = title => steps.find(step => step.step === title);
    renderLogisticsInsights("freight-insights", {
        profitability: [
            findStep("Total Costs vs Client Quote"),
            findStep("Profit Margin Check")
        ].filter(Boolean),
        costs: [
            findStep("Largest Cost Driver"),
            findStep("Import Duty Assessment"),
            {
                title: "Fuel Surcharge Sensitivity",
                message: inputs.fuelSurcharge > 0
                    ? `A 10% fuel-surcharge increase adds ${money(inputs.fuelSurcharge * 0.1)} to costs and reduces profit by the same amount.`
                    : "Enter a carrier fuel surcharge to calculate its effect on shipment profit."
            },
            {
                title: "Duty Rate Sensitivity",
                message: inputs.cargoValue > 0
                    ? `Each additional 1 percentage point of import duty adds ${money(inputs.cargoValue * 0.01)} to the landed cost.`
                    : "Enter cargo value to estimate the impact of a duty-rate change."
            }
        ],
        operations: [
            findStep("Break-even Quote"),
            findStep("Final Risk Assessment")
        ].filter(Boolean),
        growth: [
            {
                title: "Recommended Quote",
                message: `For the 20% target margin used by this tool, quote at least ${money(data.recommendedQuote)}.`
            },
            {
                title: "Profit Opportunity",
                message: data.profit > 0
                    ? `Current profit is ${money(data.profit)} per shipment. Protect this margin by monitoring port, fuel and duty charges.`
                    : "Requote above break-even and include an appropriate margin before accepting this shipment."
            }
        ]
    });

}

document.addEventListener("DOMContentLoaded", () => {
    bindLogisticsActions("logistics-freight", {
        name: "Freight import and export analysis",
        save: "saveFreightBtn",
        share: "shareFreightBtn",
        compare: "compareFreightBtn",
        csv: "exportFreightCsvBtn",
        report: "exportFreightReportBtn",
        inputMap: {
            quote: "freight-quote",
            cargoValue: "freight-cargo-value",
            insuranceRate: "freight-insurance-rate",
            freightCost: "freight-cost",
            fuelSurcharge: "freight-fuel-surcharge",
            dutyRate: "freight-duty-rate",
            customsFees: "freight-customs-fees",
            portFees: "freight-port-fees",
            handlingFees: "freight-handling-fees",
            inlandTransport: "freight-inland-transport",
            tolls: "freight-tolls",
            otherCosts: "freight-other-costs"
        }
    }, () => ({
        inputs: latestFreightInputs,
        results: latestFreightResults
    }));
    hydrateLogisticsEdit("logistics-freight", {
        quote: "freight-quote",
        cargoValue: "freight-cargo-value",
        insuranceRate: "freight-insurance-rate",
        freightCost: "freight-cost",
        fuelSurcharge: "freight-fuel-surcharge",
        dutyRate: "freight-duty-rate",
        customsFees: "freight-customs-fees",
        portFees: "freight-port-fees",
        handlingFees: "freight-handling-fees",
        inlandTransport: "freight-inland-transport",
        tolls: "freight-tolls",
        otherCosts: "freight-other-costs"
    }, runFreight);
});
