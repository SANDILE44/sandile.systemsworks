(() => {
  const numericInputs = 'input[type="number"], input[data-formatted-number="true"]';

  function normalize(value, allowDecimal) {
    let clean = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!allowDecimal) return clean.replace(/\./g, "");

    const decimalIndex = clean.indexOf(".");
    if (decimalIndex !== -1) {
      clean = clean.slice(0, decimalIndex + 1) + clean.slice(decimalIndex + 1).replace(/\./g, "");
    }
    return clean;
  }

  function formatValue(value, allowDecimal) {
    const clean = normalize(value, allowDecimal);
    const decimalIndex = clean.indexOf(".");
    const integer = decimalIndex === -1 ? clean : clean.slice(0, decimalIndex);
    const fraction = decimalIndex === -1 ? "" : clean.slice(decimalIndex);
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return grouped + fraction;
  }

  function formatInput(input, preserveCaret) {
    const allowDecimal = input.dataset.allowDecimal === "true";
    const oldValue = input.value;
    const selectionStart = preserveCaret ? input.selectionStart : null;
    const prefix = selectionStart === null ? "" : normalize(oldValue.slice(0, selectionStart), allowDecimal);
    const clean = normalize(oldValue, allowDecimal);
    const formatted = formatValue(clean, allowDecimal);

    if (formatted !== oldValue) input.value = formatted;

    if (formatted !== oldValue && selectionStart !== null && document.activeElement === input) {
      let tokens = 0;
      let caret = 0;
      while (caret < formatted.length && tokens < prefix.length) {
        if (/[\d.]/.test(formatted[caret])) tokens++;
        caret++;
      }
      input.setSelectionRange(caret, caret);
    }
  }

  function initializeInputs() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
      if (input.disabled) return;
      const allowDecimal = input.step === "any" || (input.step && input.step.includes("."));
      input.dataset.formattedNumber = "true";
      input.dataset.allowDecimal = String(allowDecimal);
      input.type = "text";
      input.inputMode = allowDecimal ? "decimal" : "numeric";
      formatInput(input, false);
    });
  }

  function getNumber(input) {
    if (!input) return 0;
    if (input.dataset.formattedNumber === "true") formatInput(input, false);
    const allowDecimal = input.dataset.allowDecimal === "true" ||
      (input.dataset.allowDecimal === undefined &&
        (input.step === "any" || (input.step && input.step.includes("."))));
    const raw = normalize(input.value, allowDecimal);
    const number = Number(raw);
    return Number.isFinite(number) ? number : 0;
  }

  document.addEventListener("input", event => {
    if (event.target.matches(numericInputs)) formatInput(event.target, true);
  }, true);
  document.addEventListener("keyup", event => {
    if (event.target.matches(numericInputs)) formatInput(event.target, true);
  }, true);
  document.addEventListener("change", event => {
    if (event.target.matches(numericInputs)) formatInput(event.target, false);
  }, true);

  window.FormattedNumberInput = { getNumber };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeInputs, { once: true });
  } else {
    initializeInputs();
  }
})();
