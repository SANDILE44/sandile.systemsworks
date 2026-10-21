document.addEventListener("DOMContentLoaded", async () => {
  // 1. Retrieve auth token with fallback key names
  const token =
    localStorage.getItem("token") || localStorage.getItem("ssw_token");
  let redirected = false;

  function go(url, message) {
    if (redirected) return;
    redirected = true;
    localStorage.setItem("authMessage", message);
    localStorage.setItem("afterLogin", window.location.pathname);
    window.location.replace(url);
  }

  /* =====================================
     1. NOT LOGGED IN: IMMEDIATE REDIRECT
  ===================================== */
  if (!token) {
    console.warn("SystemsWorks Guard: No auth token found. Redirecting...");
    go("login.html", "Please log in to access your decision engine.");
    return;
  }

  /* =====================================
     2. SAFETY CHECK: API BASE CONFIG
  ===================================== */
  const apiBase =
    window.API_BASE ||
    (window.CONFIG && window.CONFIG.API_BASE) ||
    (window.api && window.api.baseURL);

  if (!apiBase) {
    console.warn(
      "SystemsWorks Guard: API_BASE not defined yet. Allowing offline mode..."
    );
    return;
  }

  /* =====================================
     3. ACCESS & SUBSCRIPTION CHECK
  ===================================== */
  try {
    const res = await fetch(`${apiBase}/api/calculators/access`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      // Clear token via auth helper if present, else directly
      if (window.auth && typeof window.auth.clearToken === "function") {
        window.auth.clearToken();
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("ssw_token");
      }
      go("login.html", "Your session has expired. Please log in again.");
      return;
    }

    if (res.status === 403) {
      // 7-day trial or subscription check expired
      go(
        "payment.html",
        "Your 7-day trial has ended. Upgrade to keep accessing saved tools."
      );
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    console.log("SystemsWorks Guard: Access verified.");
  } catch (err) {
    console.warn(
      "Guard Warning (Backend unreachable or network error):",
      err
    );
    // Fallback: Allows user to remain on page if server is temporarily offline
  }
});
