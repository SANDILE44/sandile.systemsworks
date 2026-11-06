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

function setDecisionBanner(statusId, explanationId, decision, explanation, riskLevel, profit) {
    const status = $(statusId);
    const advice = $(explanationId);
    const rawDecision = String(decision || "").toLowerCase();
    const risk = String(riskLevel || "").toLowerCase();
    const isRejected = rawDecision.includes("reject") || rawDecision.includes("loss") ||
        (Number.isFinite(Number(profit)) && Number(profit) < 0);
    const isApproved = rawDecision.includes("approve") || rawDecision.includes("strong");

    if (status) {
        let label;
        let tone;
        if (isRejected) {
            label = "✖ Unviable Margin";
            tone = "danger";
        } else if (risk === "high" || (!isApproved && (rawDecision.includes("review") || risk === "medium"))) {
            label = "⚠ High Risk";
            tone = "warning";
        } else if (isApproved || risk === "low") {
            label = "✔ Viable Deal";
            tone = "success";
        } else {
            label = "⚠ Review Required";
            tone = "warning";
        }
        status.textContent = label;
        status.className = `decision-badge decision-badge--${tone}`;
    }

    if (advice) advice.textContent = explanation || "Review the calculated results before proceeding.";
}

function renderLogisticsInsights(panelId, groups) {
    const panel = $(panelId);
    if (!panel) return;

    Object.entries(groups).forEach(([key, items]) => {
        const content = panel.querySelector(`#${panelId.replace("-insights", "")}-insight-${key}`);
        if (!content) return;

        content.replaceChildren();
        const entries = (items || []).filter(item =>
            item && (typeof item === "string" || item.title || item.step || item.message)
        );

        if (!entries.length) {
            const empty = document.createElement("article");
            empty.className = "insight-card";
            const message = document.createElement("p");
            message.textContent = "Enter analysis details to see recommendations for this section.";
            empty.appendChild(message);
            content.appendChild(empty);
            return;
        }

        entries.forEach((item, index) => {
            const card = document.createElement("article");
            card.className = "insight-card";
            const title = document.createElement("h4");
            const message = document.createElement("p");
            title.textContent = typeof item === "string"
                ? `Recommendation ${index + 1}`
                : item.title || item.step || "Recommendation";
            message.textContent = typeof item === "string" ? item : item.message || "";
            card.append(title, message);
            content.appendChild(card);
        });
    });
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

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".insights-panel").forEach(panel => {
        const tabs = Array.from(panel.querySelectorAll('[role="tab"]'));
        const activateTab = tab => {
            tabs.forEach(candidate => {
                const selected = candidate === tab;
                candidate.setAttribute("aria-selected", String(selected));
                candidate.tabIndex = selected ? 0 : -1;
                const content = document.getElementById(candidate.getAttribute("aria-controls"));
                if (content) content.hidden = !selected;
            });
        };

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => activateTab(tab));
            tab.addEventListener("keydown", event => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const direction = event.key === "ArrowRight" ? 1 : -1;
                const next = tabs[(index + direction + tabs.length) % tabs.length];
                activateTab(next);
                next.focus();
            });
        });
    });
});

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
                title: name,
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

function logisticsReportRows(values, excluded = new Set()) {
    return Object.entries(values || []).flatMap(([key, value]) => {
        if (excluded.has(key) || value == null) return [];
        const label = key
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .replace(/[_-]+/g, " ")
            .replace(/\b\w/g, character => character.toUpperCase());
        if (["string", "number", "boolean"].includes(typeof value)) {
            return [[label, value]];
        }
        if (Array.isArray(value)) {
            if (value.every(item => ["string", "number", "boolean"].includes(typeof item))) {
                return [[label, value.join(", ")]];
            }
            return [];
        }
        if (typeof value === "object") {
            return Object.entries(value).flatMap(([childKey, childValue]) => {
                if (childValue == null || !["string", "number", "boolean"].includes(typeof childValue)) return [];
                const childLabel = childKey
                    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
                    .replace(/[_-]+/g, " ")
                    .replace(/\b\w/g, character => character.toUpperCase());
                return [[`${label} - ${childLabel}`, childValue]];
            });
        }
        return [];
    });
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
    $(ids.report)?.addEventListener("click", async () => {
        const state = latest();
        if (!state) return;

        const name = window.logisticsScenarioName || ids.name;
        const reportTitles = {
            "logistics-operations": "Monthly Logistics Operations Report",
            "logistics-shipment": "Shipment Risk & Pricing Report",
            "logistics-freight": "Freight Import / Export Report"
        };
        const excluded = new Set([
            "steps",
            "flags",
            "financialSummary",
            "profitability",
            "priorityActions",
            "costAnalysis",
            "pricingStrategy",
            "breakEvenAnalysis",
            "annualOutlook"
        ]);

        try {
            await window.SandileReportPdf.download({
                projectName: name,
                reportTitle: reportTitles[type] || "Logistics Decision Report",
                date: new Date().toLocaleDateString("en-ZA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }),
                sections: [
                    { title: "Logistics Inputs", rows: logisticsReportRows(state.inputs) },
                    { title: "Calculated Results", rows: logisticsReportRows(state.results, excluded) }
                ],
                filename: name
            });
        } catch (error) {
            console.error("Could not generate logistics PDF report:", error);
            alert("The logistics PDF report could not be generated. Please try again.");
        }
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
