(function () {
  let jsPdfPromise;

  function loadJsPdf() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfPromise) return jsPdfPromise;

    jsPdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      script.onload = () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error("The PDF library loaded without exposing jsPDF."));
      };
      script.onerror = () => reject(new Error("The PDF library could not be loaded."));
      document.head.appendChild(script);
    }).catch(error => {
      jsPdfPromise = null;
      throw error;
    });

    return jsPdfPromise;
  }

  function safeFilename(value) {
    return String(value || "business-report")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "business-report";
  }

  async function download({ projectName, reportTitle, date, sections, filename }) {
    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const tableWidth = pageWidth - margin * 2;
    const labelWidth = 205;
    const valueWidth = tableWidth - labelWidth;
    const bottomLimit = pageHeight - 42;
    let y;

    function drawPageHeader() {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Sandile SystemsWorks", margin, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(String(reportTitle || "Business Decision Report"), margin, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const nameLines = doc.splitTextToSize(String(projectName || "Untitled analysis"), tableWidth - 125);
      doc.text(nameLines, margin, 82);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(String(date || ""), pageWidth - margin, 82, { align: "right" });
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1);
      doc.line(margin, 98, pageWidth - margin, 98);
      y = 116;
    }

    function drawSectionHeaders(title) {
      doc.setFillColor(226, 232, 240);
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.7);
      doc.rect(margin, y, tableWidth, 23, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(String(title), margin + 8, y + 15);
      y += 23;

      doc.setFillColor(30, 41, 59);
      doc.setDrawColor(30, 41, 59);
      doc.rect(margin, y, tableWidth, 22, "FD");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Metric", margin + 8, y + 14);
      doc.text("Value", margin + labelWidth + 8, y + 14);
      y += 22;
    }

    drawPageHeader();
    (sections || []).forEach(section => {
      drawSectionHeaders(section.title || "Details");
      (section.rows || []).forEach(([label, value], index) => {
        const labelLines = doc.splitTextToSize(String(label ?? ""), labelWidth - 16);
        const valueLines = doc.splitTextToSize(String(value ?? "—"), valueWidth - 16);
        const rowHeight = Math.max(24, Math.max(labelLines.length, valueLines.length) * 12 + 10);

        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          drawPageHeader();
          drawSectionHeaders(section.title || "Details");
        }

        doc.setFillColor(index % 2 === 0 ? 248 : 255, index % 2 === 0 ? 250 : 255, index % 2 === 0 ? 252 : 255);
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.45);
        doc.rect(margin, y, tableWidth, rowHeight, "FD");
        doc.line(margin + labelWidth, y, margin + labelWidth, y + rowHeight);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(labelLines, margin + 8, y + 15);
        doc.text(valueLines, margin + labelWidth + 8, y + 15);
        y += rowHeight;
      });
      y += 14;
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 17, { align: "right" });
    }

    doc.save(`${safeFilename(filename || projectName)}-report.pdf`);
  }

  window.SandileReportPdf = { download };
})();
