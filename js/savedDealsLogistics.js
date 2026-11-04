(() => {

const $ = (id) => document.getElementById(id);

const API_BASE = window.API_BASE || "";

let dealsCache = [];
const searchInput = $("searchInput");
const searchMeta = $("searchMeta");

/* ================= API ================= */
async function api(url, method = "GET") {

  const token = localStorage.getItem("token");
  if (!token) {
    location.replace("login.html");
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      location.replace("login.html");
      return null;
    }

    if (res.status === 403) {
      location.replace("payment.html");
      return null;
    }

    if (!res.ok) {
      console.error(`Saved logistics request failed (${res.status}):`, await res.text());
      return null;
    }

    return await res.json();

  } catch (err) {
    console.error("API error:", err);
    return null;
  }
}

/* ================= LOAD ================= */
async function loadDeals() {
  const all = await api("/api/saved-deals");

  if (!Array.isArray(all)) return null;

  // ONLY LOGISTICS DEALS
  return all.filter(d =>
    d.type === "logistics-operations" ||
    d.type === "logistics-business" ||
    d.type === "logistics-shipment" ||
    d.type === "logistics-freight"
  ).map(deal => deal.type === "logistics-business"
    ? { ...deal, type: "logistics-operations" }
    : deal
  ).sort((a, b) =>
    (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
  );
}

/* ================= DELETE ================= */
async function deleteDeal(id) {
  await api(`/api/saved-deals/${id}`, "DELETE");
  init();
}

/* ================= EDIT ROUTER (IMPORTANT FIX) ================= */
function editDeal(deal) {

  localStorage.setItem("editDeal", JSON.stringify(deal));
  localStorage.setItem("editDealId", deal._id);

  // 👇 SMART ROUTING TO CORRECT MODULE

  switch (deal.type) {

    case "logistics-operations":
      localStorage.setItem("activeLogisticsTab", "operations");
      window.location.href = "industry-logistics.html";
      break;

    case "logistics-shipment":
      localStorage.setItem("activeLogisticsTab", "shipment");
      window.location.href = "industry-logistics.html";
      break;

    case "logistics-freight":
      localStorage.setItem("activeLogisticsTab", "freight");
      window.location.href = "industry-logistics.html";
      break;

    default:
      window.location.href = "industry-logistics.html";
  }
}

/* ================= FORMAT ================= */
function money(v) {
  return (Number(v) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getRevenue(deal) {
  const results = deal.results || {};
  const inputs = deal.inputs || {};
  if (deal.type === "logistics-operations") {
    return results.totalRevenue ?? Number(inputs.shipments || 0) * Number(inputs.revenuePer || 0);
  }
  return results.revenue ?? results.quote ?? inputs.quote;
}

function updateSearchMeta(visibleCount) {
  if (!searchMeta) return;
  const total = dealsCache.length;
  searchMeta.textContent = searchInput?.value.trim()
    ? `Showing ${visibleCount} of ${total} ${total === 1 ? "deal" : "deals"}`
    : `Showing all ${total} ${total === 1 ? "deal" : "deals"} · newest first`;
}

/* ================= LABEL SYSTEM ================= */
function getLabel(type) {
  if (type === "logistics-operations") return "MONTHLY OPERATIONS";
  if (type === "logistics-shipment") return "SHIPMENT ANALYSIS";
  if (type === "logistics-freight") return "FREIGHT ANALYSIS";
  return "LOGISTICS";
}

/* ================= RENDER ================= */
function renderDeals(deals) {

  const container = $("savedDealsContainer");
  const empty = $("emptyState");

  dealsCache = Array.isArray(deals) ? deals : [];
  const query = searchInput?.value.trim().toLocaleLowerCase() || "";
  const visibleDeals = dealsCache.filter(deal => {
    const text = [
      getLabel(deal.type),
      deal.clientName,
      deal.name,
      deal.results?.profit,
      deal.results?.margin,
      deal.results?.decision?.status,
      deal.results?.status,
      deal.results?.decision
    ].map(value => typeof value === "object" ? JSON.stringify(value) : String(value ?? ""))
      .join(" ").toLocaleLowerCase();
    return !query || text.includes(query);
  });
  updateSearchMeta(visibleDeals.length);

  if (!dealsCache.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (!visibleDeals.length) {
    container.innerHTML = `<div class="no-search-results"><i data-lucide="search-x"></i><p>No logistics deals match "${escapeHTML(searchInput.value.trim())}".</p></div>`;
    if (empty) empty.style.display = "none";
    window.lucide?.createIcons();
    return;
  }

  if (empty) empty.style.display = "none";

  container.innerHTML = visibleDeals.map(d => {

    const dealIndex = dealsCache.indexOf(d);
    const date = d.createdAt
      ? new Date(d.createdAt).toLocaleDateString()
      : "—";
    const revenue = getRevenue(d);
    const status = d.results?.status || d.results?.decision?.status || d.results?.decision || d.results?.riskLevel;

    return `
      <div class="deal-card">

        <div class="deal-title">
          <i data-lucide="${d.type === "logistics-freight" ? "ship" : "truck"}" aria-hidden="true"></i>
          ${getLabel(d.type)} - ${escapeHTML(date)}
        </div>

        <div class="deal-body">
          <div><strong>Profit:</strong> ${money(d.results?.profit)}</div>
          <div><strong>Revenue / quote:</strong> ${revenue == null ? "—" : money(revenue)}</div>
          <div><strong>Margin:</strong> ${Number(d.results?.margin || 0).toFixed(2)}%</div>
          ${status ? `<div><strong>Status:</strong> ${escapeHTML(typeof status === "object" ? status.status || "Analysis complete" : status)}</div>` : ""}
        </div>

        <div class="deal-actions">

          <button class="edit-btn" type="button" data-index="${dealIndex}">
            <i data-lucide="square-pen" aria-hidden="true"></i> Edit / Open
          </button>
          <button class="share-btn" type="button" data-index="${dealIndex}">
            <i data-lucide="share-2" aria-hidden="true"></i> Share
          </button>
          <button class="compare-btn" type="button" data-index="${dealIndex}">
            <i data-lucide="scale" aria-hidden="true"></i> Compare
          </button>

          <button class="delete-btn" type="button" data-id="${escapeHTML(d._id)}">
            <i data-lucide="trash-2" aria-hidden="true"></i> Delete
          </button>

        </div>

      </div>
    `;
  }).join("");
  window.lucide?.createIcons();
}

/* ================= INIT ================= */
async function init() {
  const deals = await loadDeals();
  if (deals === null) {
    const empty = $("emptyState");
    if (empty) {
      empty.style.display = "block";
      empty.querySelector("p").textContent = "Could not load logistics deals. Please refresh to try again.";
    }
    return;
  }
  renderDeals(deals);
}

/* ================= EVENTS ================= */
searchInput?.addEventListener("input", () => renderDeals(dealsCache));

document.addEventListener("click", async (e) => {

  const del = e.target.closest(".delete-btn");
  if (del) {
    await deleteDeal(del.dataset.id);
    return;
  }

  const edit = e.target.closest(".edit-btn");
  if (edit) {
    const deal = dealsCache[edit.dataset.index];
    if (deal) editDeal(deal);
    return;
  }

  const share = e.target.closest(".share-btn");
  if (share) {
    const deal = dealsCache[share.dataset.index];
    if (deal) {
      await window.shareLogisticsDeal(
        deal.type,
        deal.clientName || getLabel(deal.type),
        deal.inputs || {},
        deal.results || {}
      );
    }
    return;
  }

  const compare = e.target.closest(".compare-btn");
  if (compare) {
    const deal = dealsCache[compare.dataset.index];
    if (deal) {
      window.addLogisticsToCompare(
        deal.type,
        deal.clientName || getLabel(deal.type),
        deal.inputs || {},
        deal.results || {}
      );
    }
  }

});

/* ================= START ================= */
document.addEventListener("DOMContentLoaded", init);

})();
