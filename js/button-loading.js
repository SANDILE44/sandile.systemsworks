(() => {
  const activeButtons = new WeakSet();
  const minimumVisibleMs = 300;

  if (!document.getElementById("button-loading-styles")) {
    const style = document.createElement("style");
    style.id = "button-loading-styles";
    style.textContent = `
      @keyframes button-loading-spin { to { transform: rotate(360deg); } }
      .button-loading-spinner {
        display: inline-block;
        width: 1em;
        height: 1em;
        flex: 0 0 auto;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: button-loading-spin .7s linear infinite;
        vertical-align: -0.15em;
      }
      .button-loading-content {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: .55em;
      }
    `;
    document.head.appendChild(style);
  }

  async function run(button, action) {
    if (!button || activeButtons.has(button)) return;

    activeButtons.add(button);
    const originalHTML = button.innerHTML;
    const wasDisabled = button.disabled;
    const originalAriaBusy = button.getAttribute("aria-busy");
    const originalAriaLabel = button.getAttribute("aria-label");
    const label = button.textContent.trim() || originalAriaLabel || "Working";
    const startedAt = Date.now();

    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    if (!originalAriaLabel) button.setAttribute("aria-label", `${label}, loading`);
    button.innerHTML = "";

    const content = document.createElement("span");
    content.className = "button-loading-content";
    const spinner = document.createElement("span");
    spinner.className = "button-loading-spinner";
    spinner.setAttribute("aria-hidden", "true");
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    content.appendChild(spinner);
    content.appendChild(labelElement);
    button.appendChild(content);

    try {
      return await action();
    } finally {
      const remainingTime = minimumVisibleMs - (Date.now() - startedAt);
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }
      button.innerHTML = originalHTML;
      button.disabled = wasDisabled;
      if (originalAriaBusy === null) button.removeAttribute("aria-busy");
      else button.setAttribute("aria-busy", originalAriaBusy);
      if (originalAriaLabel === null) button.removeAttribute("aria-label");
      else button.setAttribute("aria-label", originalAriaLabel);
      activeButtons.delete(button);
    }
  }

  function bind(button, action) {
    if (!button) return;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      run(button, action).catch((error) => {
        console.error("Button action failed:", error);
        alert("That action could not be completed. Please try again.");
      });
    });
  }

  window.ButtonLoading = { bind, run };
})();
