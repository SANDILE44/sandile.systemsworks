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
        quote: parseFloat(elQuote.value) || 0,
        minMargin: parseFloat($("ship-min-margin")?.value) || 0,
        buffer: parseFloat($("ship-buffer")?.value) || 0,

        // Distance
        distance: parseFloat($("ship-distance")?.value) || 0,
        fuelPerKm: parseFloat($("ship-fuel-km")?.value) || 0,
        vehiclePerKm: parseFloat($("ship-vehicle-km")?.value) || 0,
        loadFactor: parseFloat($("ship-load-factor")?.value) || 0,

        // Driver
        drivingHours: parseFloat($("ship-driving-hours")?.value) || 0,
        waitingHours: parseFloat($("ship-wait-hours")?.value) || 0,
        driverRate: parseFloat($("ship-driver-rate")?.value) || 0,

        // Route Costs
        tolls: parseFloat($("ship-tolls")?.value) || 0,
        permits: parseFloat($("ship-permits")?.value) || 0,
        otherFees: parseFloat($("ship-other-fees")?.value) || 0,

        // Cargo
        cargoValue: parseFloat($("ship-cargo-value")?.value) || 0,
        insuranceRate: parseFloat($("ship-insurance")?.value) || 0,

        // Additional Charges
        duties: parseFloat($("ship-duties")?.value) || 0,
        handling: parseFloat($("ship-handling")?.value) || 0,
        passThrough: parseFloat($("ship-pass-through")?.value) || 0
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

    setText("ship-decision", data.decision || "—");
    setText("ship-reason", data.reason || "—");

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

    if (data.decision) {

        setClass(
            $("ship-decision"),
            `decision-${String(data.decision)
                .toLowerCase()
                .replace(/\s+/g, "-")}`
        );

    }

    /* ==========================
       STEP-BY-STEP GUIDANCE
    ========================== */

    renderSteps(
        "ship-steps",
        data.steps || []
    );

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
