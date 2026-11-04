/* =====================================================
   SHARED HELPERS
===================================================== */

const $ = (id) => document.getElementById(id);

const API_BASE = window.API_BASE || "";

/* =====================================================
   FORMATTERS
===================================================== */

const money = value =>
    (Number(value) || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const percent = value => {
    const n = Number(value) || 0;
    return (Math.abs(n) <= 1 ? n * 100 : n).toFixed(2) + "%";
};

/* =====================================================
   API
===================================================== */

async function apiPost(url, body) {

    const token = localStorage.getItem("token");

    if (!token) {
        location.replace("login.html");
        return;
    }

    const response = await fetch(`${API_BASE}${url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    if (response.status === 401) {
        location.replace("login.html");
        return;
    }

    if (response.status === 403) {
        location.replace("payment.html");
        return;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Status:", response.status, "Response:", errorText);
        return null;
    }

    return response.json();
}

/* =====================================================
   UI HELPERS
===================================================== */

function setText(id, value) {

    const el = $(id);

    if (!el) return;

    el.textContent = value ?? "—";
}

function setClass(el, className) {

    if (!el) return;

    el.className = `output-value ${className || ""}`;
}

function renderSteps(containerId, steps = []) {

    const container = $(containerId);

    if (!container) return;

    container.innerHTML = steps.map(step => `
        <li>
            <strong>${step.step}</strong><br>
            ${step.message}
        </li>
    `).join("");
}

/* =====================================================
   DEBOUNCE
===================================================== */

const debounceTimers = {};

function debounce(key, callback, delay = 300) {

    clearTimeout(debounceTimers[key]);

    debounceTimers[key] = setTimeout(callback, delay);

}

/* =====================================================
   SAVE DEALS
===================================================== */

function getSavedDeals(type) {

    return JSON.parse(
        localStorage.getItem(`deals_${type}`) || "[]"
    );

}

async function saveDeal(type, payload) {
    // Use API endpoint for saving deals, like other industries
    const token = localStorage.getItem("token");
    if (!token) {
        location.replace("login.html");
        return;
    }
    const dealPayload = {
        type,
        ...payload
    };
    const res = await fetch(`${API_BASE}/api/saved-deals`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(dealPayload)
    });
    if (res.status === 401) {
        location.replace("login.html");
        return;
    }
    if (res.status === 403) {
        location.replace("payment.html");
        return;
    }
    if (!res.ok) {
        const errorText = await res.text();
        alert("Failed to save deal: " + errorText);
        return null;
    }
    alert("Deal saved successfully!");
    return await res.json();
}

function updateDeal(type, id, payload) {

    const deals = getSavedDeals(type).map(deal =>

        deal.id === id
            ? {
                ...deal,
                ...payload,
                updatedAt: new Date().toISOString()
              }
            : deal

    );

    localStorage.setItem(
        `deals_${type}`,
        JSON.stringify(deals)
    );

}

async function shareLogisticsDeal(type, name, inputs, results) {
    const token = localStorage.getItem("token");
    if (!token) {
        location.replace("login.html");
        return;
    }

    const sharedResults = { ...results };
    if (sharedResults.decision && typeof sharedResults.decision === "object") {
        sharedResults.status = sharedResults.decision.status || sharedResults.decision.advice;
        sharedResults.action = sharedResults.action || sharedResults.decision.advice;
        sharedResults.riskLevel = sharedResults.riskLevel || sharedResults.decision.riskLevel;
        delete sharedResults.decision;
    }

    try {
        const response = await fetch(`${API_BASE}/api/share`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                shareId: `share_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                type,
                inputs,
                results: sharedResults,
                meta: { title: name, createdBy: "Sandile" },
                permissions: { mode: "view", isPublic: true }
            })
        });
        if (response.status === 401) {
            location.replace("login.html");
            return;
        }
        if (response.status === 403) {
            location.replace("payment.html");
            return;
        }
        if (!response.ok) throw new Error(await response.text() || `Request failed (${response.status})`);

        const data = await response.json();
        const id = data.shareId || data.id || data._id;
        if (!id) throw new Error("The server did not return a share link ID.");
        const url = `${window.location.origin}/share.html?id=${encodeURIComponent(id)}`;
        const message = `${name} - Logistics analysis\nView the results: ${url}`;
        if (navigator.share) {
            await navigator.share({ title: `${name} analysis`, text: message, url });
        } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(message);
            alert("Share link copied to clipboard.");
        } else {
            window.prompt("Copy this share link:", url);
        }
    } catch (error) {
        console.error("Could not share logistics deal:", error);
        alert(`Failed to share deal: ${error.message}`);
    }
}

function addLogisticsToCompare(type, name, inputs, results) {
    const comparableResults = { ...results };
    if (comparableResults.decision && typeof comparableResults.decision === "object") {
        comparableResults.status = comparableResults.decision.status || comparableResults.decision.advice;
        comparableResults.riskLevel = comparableResults.riskLevel || comparableResults.decision.riskLevel;
        delete comparableResults.decision;
    }
    const added = window.DealCompare?.addCurrentScenario({
        type,
        name,
        inputs,
        calculatedInputs: inputs,
        results: comparableResults
    });
    if (added) window.location.href = "compare.html";
}

function downloadLogisticsCsv(filename, inputs, results) {
    const rows = [
        ["Section", "Field", "Value"],
        ...Object.entries(inputs).map(([key, value]) => ["Inputs", key, value]),
        ...Object.entries(results)
            .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
            .map(([key, value]) => ["Results", key, value])
    ];
    const csv = rows.map(row => row.map(value =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindLogisticsActions(type, ids, getLatest) {
    const latest = () => {
        const state = getLatest();
        if (!state?.inputs || !state?.results) {
            alert("Run the calculation first.");
            return null;
        }
        if (ids.inputMap && Object.entries(ids.inputMap).some(([key, id]) => {
            const input = $(id);
            return input && (Number(input.value) || 0) !== Number(state.inputs[key] || 0);
        })) {
            alert("Your latest input changes are still being calculated. Please wait, then try again.");
            return null;
        }
        return state;
    };

    $(ids.save)?.addEventListener("click", async () => {
        const state = latest();
        if (!state) return;
        try {
            await saveDeal(type, {
                clientName: window.logisticsScenarioName || ids.name,
                ...state
            });
        } catch (error) {
            console.error("Could not save logistics deal:", error);
            alert(`Failed to save deal: ${error.message}`);
        }
    });
    $(ids.share)?.addEventListener("click", async () => {
        const state = latest();
        if (state) await shareLogisticsDeal(
            type,
            window.logisticsScenarioName || ids.name,
            state.inputs,
            state.results
        );
    });
    $(ids.compare)?.addEventListener("click", () => {
        const state = latest();
        if (state) addLogisticsToCompare(
            type,
            window.logisticsScenarioName || ids.name,
            state.inputs,
            state.results
        );
    });
    $(ids.csv)?.addEventListener("click", () => {
        const state = latest();
        if (state) downloadLogisticsCsv(`${type}-report.csv`, state.inputs, state.results);
    });
    $(ids.report)?.addEventListener("click", () => {
        if (latest()) window.print();
    });
}

function hydrateLogisticsEdit(type, fieldMap, run) {
    const compareId = new URLSearchParams(window.location.search).get("compareScenario");
    let scenario = compareId ? window.DealCompare?.getScenario(compareId) : null;
    let inputs;
    let name = "";

    if (compareId && scenario?.type !== type) return false;
    if (scenario?.type === type) {
        inputs = scenario.inputs || {};
        name = scenario.name;
        const compareButton = $({
            "logistics-operations": "compareOperationsBtn",
            "logistics-shipment": "compareShipmentBtn",
            "logistics-freight": "compareFreightBtn"
        }[type]);
        const label = compareButton?.querySelector("span");
        if (label) label.textContent = "Update Compare";
    } else {
        try {
            const deal = JSON.parse(localStorage.getItem("editDeal") || "null");
            if (deal?.type !== type) return false;
            inputs = deal.inputs || {};
            name = deal.clientName || deal.name;
            localStorage.removeItem("editDeal");
            localStorage.removeItem("editDealId");
        } catch (error) {
            console.error("Could not load saved logistics deal:", error);
            alert("The saved logistics deal could not be loaded.");
            return false;
        }
    }

    Object.entries(fieldMap).forEach(([key, id]) => {
        const input = $(id);
        if (input) input.value = inputs[key] ?? "";
    });

    window.logisticsScenarioName = name || "";
    const tab = {
        "logistics-operations": "operations",
        "logistics-shipment": "shipment",
        "logistics-freight": "freight"
    }[type];
    $(`btn-${tab}`)?.click();
    run();
    return true;
}

/* =====================================================
   EVENT BINDING
===================================================== */

function bindMonthly() {

    const panel = $("operations-panel");

    if (!panel || typeof runMonthly !== "function") return;

    panel.querySelectorAll("input").forEach(input => {

        input.addEventListener("input", () =>
            debounce("monthly", runMonthly)
        );

    });

}

function bindShipment() {

    const panel = $("shipment-panel");

    if (!panel || typeof runShipment !== "function") return;

    panel.querySelectorAll("input").forEach(input => {

        input.addEventListener("input", () =>
            debounce("shipment", runShipment)
        );

    });

}

function bindFreight() {

    const panel = $("freight-panel");

    if (!panel || typeof runFreight !== "function") return;

    panel.querySelectorAll("input").forEach(input => {

        input.addEventListener("input", () =>
            debounce("freight", runFreight)
        );

    });

}

document.addEventListener("DOMContentLoaded", () => {

    bindMonthly();
    bindShipment();
    bindFreight();

});
