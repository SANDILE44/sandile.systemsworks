/* =====================================================
   PER SHIPMENT CALCULATOR
===================================================== */

let latestShipmentInputs = null;
let latestShipmentResults = null;

async function runShipment() {

    const elQuote = $("ship-quote");
    if (!elQuote) return;

    const inputs = {

        // Pricing
        quote: FormattedNumberInput.getNumber(elQuote),
        minMargin: FormattedNumberInput.getNumber($("ship-min-margin")),
        buffer: FormattedNumberInput.getNumber($("ship-buffer")),

        // Distance
        distance: FormattedNumberInput.getNumber($("ship-distance")),
        fuelPerKm: FormattedNumberInput.getNumber($("ship-fuel-km")),
        vehiclePerKm: FormattedNumberInput.getNumber($("ship-vehicle-km")),
        loadFactor: FormattedNumberInput.getNumber($("ship-load-factor")),

        // Driver
        drivingHours: FormattedNumberInput.getNumber($("ship-driving-hours")),
        waitingHours: FormattedNumberInput.getNumber($("ship-wait-hours")),
        driverRate: FormattedNumberInput.getNumber($("ship-driver-rate")),

        // Route Costs
        tolls: FormattedNumberInput.getNumber($("ship-tolls")),
        permits: FormattedNumberInput.getNumber($("ship-permits")),
        otherFees: FormattedNumberInput.getNumber($("ship-other-fees")),

        // Cargo
        cargoValue: FormattedNumberInput.getNumber($("ship-cargo-value")),
        insuranceRate: FormattedNumberInput.getNumber($("ship-insurance")),

        // Additional Charges
        duties: FormattedNumberInput.getNumber($("ship-duties")),
        handling: FormattedNumberInput.getNumber($("ship-handling")),
        passThrough: FormattedNumberInput.getNumber($("ship-pass-through"))
    };

    latestShipmentInputs = null;
    latestShipmentResults = null;
    const data = await apiPost(
        "/api/calculators/logistics/shipment",
        inputs
    );

    if (!data) return;
    latestShipmentInputs = { ...inputs };
    latestShipmentResults = data;

    /* ==========================
       RESULTS
    ========================== */

    setText("ship-total-cost", money(data.totalCost));
    setText("ship-profit", money(data.profit));
    setText("ship-margin", percent(data.margin));
    setText("ship-min-quote", money(data.recommendedMinQuote));
    setText("ship-roi", percent(data.totalCost > 0 ? (data.profit / data.totalCost) * 100 : 0));
    setText("ship-breakeven", money(data.totalCost));
    setText("ship-run-rate", money(data.profit));

    setText("ship-risk", data.shipmentRisk || "—");
    setDecisionBanner("ship-decision", "ship-reason", data.decision, data.reason, data.shipmentRisk, data.profit);

    /* ==========================
       STYLING
    ========================== */

    setClass(
        $("ship-profit"),
        data.profit >= 0
            ? "profit-positive"
            : "profit-negative"
    );

    setClass(
        $("ship-margin"),
        data.margin >= 20
            ? "margin-strong"
            : data.margin >= 10
            ? "margin-medium"
            : "margin-low"
    );

    if (data.shipmentRisk) {
        setClass(
            $("ship-risk"),
            `risk-${String(data.shipmentRisk).toLowerCase().replace(/\s+/g, "-")}`
        );
    }

    const steps = data.steps || [];
    const findStep = title => steps.find(step => step.step === title);
    const fuelCost = inputs.distance * inputs.fuelPerKm;
    renderLogisticsInsights("shipment-insights", {
        profitability: [
            findStep("Evaluate Costs"),
            findStep("Margin Check")
        ].filter(Boolean),
        costs: [
            findStep("Largest Cost Driver"),
            {
                title: "Fuel Cost Sensitivity",
                message: fuelCost > 0
                    ? `A 10% increase in route fuel cost adds ${money(fuelCost * 0.1)} to shipment costs and reduces profit by the same amount.`
                    : "Enter route distance and fuel cost per kilometre to calculate fuel sensitivity."
            },
            {
                title: "Duty & Handling Check",
                message: inputs.duties + inputs.handling > 0
                    ? `Duties and handling add ${money(inputs.duties + inputs.handling)} to this shipment. Verify these charges are included in the client quote.`
                    : "Confirm whether this route requires duties or handling charges before finalizing the quote."
            }
        ],
        operations: [
            findStep("Load Factor Impact"),
            findStep("Final Risk Assessment")
        ].filter(Boolean),
        growth: [
            findStep("Recommended Minimum Quote"),
            {
                title: "Pricing Recommendation",
                message: `Target a quote of at least ${money(data.recommendedMinQuote)} to meet the required margin and buffer.`
            }
        ]
    });

}

document.addEventListener("DOMContentLoaded", () => {
    bindLogisticsActions("logistics-shipment", {
        name: "Shipment risk analysis",
        save: "saveShipmentBtn",
        share: "shareShipmentBtn",
        compare: "compareShipmentBtn",
        csv: "exportShipmentCsvBtn",
        report: "exportShipmentReportBtn",
        inputMap: {
            quote: "ship-quote",
            minMargin: "ship-min-margin",
            buffer: "ship-buffer",
            distance: "ship-distance",
            fuelPerKm: "ship-fuel-km",
            vehiclePerKm: "ship-vehicle-km",
            loadFactor: "ship-load-factor",
            drivingHours: "ship-driving-hours",
            waitingHours: "ship-wait-hours",
            driverRate: "ship-driver-rate",
            tolls: "ship-tolls",
            permits: "ship-permits",
            otherFees: "ship-other-fees",
            cargoValue: "ship-cargo-value",
            insuranceRate: "ship-insurance",
            duties: "ship-duties",
            handling: "ship-handling",
            passThrough: "ship-pass-through"
        }
    }, () => ({
        inputs: latestShipmentInputs,
        results: latestShipmentResults
    }));
    hydrateLogisticsEdit("logistics-shipment", {
        quote: "ship-quote",
        minMargin: "ship-min-margin",
        buffer: "ship-buffer",
        distance: "ship-distance",
        fuelPerKm: "ship-fuel-km",
        vehiclePerKm: "ship-vehicle-km",
        loadFactor: "ship-load-factor",
        drivingHours: "ship-driving-hours",
        waitingHours: "ship-wait-hours",
        driverRate: "ship-driver-rate",
        tolls: "ship-tolls",
        permits: "ship-permits",
        otherFees: "ship-other-fees",
        cargoValue: "ship-cargo-value",
        insuranceRate: "ship-insurance",
        duties: "ship-duties",
        handling: "ship-handling",
        passThrough: "ship-pass-through"
    }, runShipment);
});
