(function () {
  "use strict";

  var form = document.getElementById("inspection-form");
  var submitBtn = document.getElementById("submit-btn");
  var statusMsg = document.getElementById("status-msg");

  var toggleState = {}; // name -> selected value

  // ---- Toggle-group buttons (act like radio groups) ----
  document.querySelectorAll(".toggle-group").forEach(function (group) {
    var name = group.dataset.name;
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".toggle");
      if (!btn || !group.contains(btn)) return;
      group.querySelectorAll(".toggle").forEach(function (b) {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");
      toggleState[name] = btn.dataset.value;
      onToggleChanged(name, btn.dataset.value);
    });
  });

  function onToggleChanged(name, value) {
    if (name === "roofType") {
      var other = document.getElementById("roofTypeOther");
      other.classList.toggle("visible", value === "Other");
      if (value !== "Other") other.value = "";
    }
  }

  // ---- Component checkboxes reveal qty/detail rows ----
  document.querySelectorAll(".component-row").forEach(function (row) {
    var check = row.querySelector(".comp-check");
    var qtyRow = row.querySelector(".qty-row");
    check.addEventListener("change", function () {
      if (qtyRow) qtyRow.classList.toggle("visible", check.checked);
    });
  });

  // ---- Validation helpers ----
  function setFieldError(el, hasError) {
    el.classList.toggle("field-error", hasError);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setStatus(text, kind) {
    statusMsg.textContent = text || "";
    statusMsg.className = "status-msg" + (kind ? " " + kind : "");
  }

  // ---- Gather answers ----
  function gatherAnswers() {
    var address = document.getElementById("address").value.trim();
    var clientName = document.getElementById("clientName").value.trim();
    var reportEmail = document.getElementById("reportEmail").value.trim();
    var notes = document.getElementById("notes").value.trim();
    var roofTypeOther = document.getElementById("roofTypeOther").value.trim();

    var roofType = toggleState.roofType || "";
    var roofTypeLabel = roofType === "Other" && roofTypeOther ? "Other (" + roofTypeOther + ")" : roofType;

    var components = [];
    document.querySelectorAll(".component-row").forEach(function (row) {
      var check = row.querySelector(".comp-check");
      if (!check.checked) return;
      var name = row.dataset.component;

      if (name === "Chimney") {
        var cricket = toggleState.chimneyCricket || "Not recorded";
        components.push({ name: "Chimney", present: "Yes", detail: "Existing cricket: " + cricket });
        return;
      }

      if (name === "Other") {
        var text = row.querySelector(".qty-text").value.trim();
        var qty = row.querySelector(".qty-input").value.trim();
        var detail = [text, qty ? "Qty: " + qty : ""].filter(Boolean).join(" — ");
        components.push({ name: text ? text : "Other", present: "Yes", detail: detail || "-" });
        return;
      }

      var sizeInputs = row.querySelectorAll(".size-field");
      if (sizeInputs.length) {
        var parts = [];
        sizeInputs.forEach(function (sf) {
          var label = sf.querySelector("label").textContent;
          var val = sf.querySelector(".qty-input").value.trim();
          if (val) parts.push(label + ": " + val);
        });
        components.push({ name: name, present: "Yes", detail: parts.length ? parts.join(", ") : "-" });
        return;
      }

      var qtyInput = row.querySelector(".qty-input");
      var qtyVal = qtyInput ? qtyInput.value.trim() : "";
      components.push({ name: name, present: "Yes", detail: qtyVal ? "Qty: " + qtyVal : "-" });
    });

    return {
      address: address,
      clientName: clientName,
      reportEmail: reportEmail,
      notes: notes,
      soffitType: toggleState.soffitType || "Not recorded",
      soffitIntake: toggleState.soffitIntake || "Not recorded",
      gableVents: toggleState.gableVents || "Not recorded",
      fasciaDamage: toggleState.fasciaDamage || "Not recorded",
      dripEdge: toggleState.dripEdge || "Not recorded",
      roofType: roofTypeLabel || "Not recorded",
      stories: toggleState.stories || "Not recorded",
      components: components
    };
  }

  // ---- PDF generation ----
  function buildPdf(data) {
    var jsPDFCtor = window.jspdf.jsPDF;
    var doc = new jsPDFCtor({ unit: "pt", format: "letter" });
    var margin = 48;
    var y = margin;
    var pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Roof Inspection Report", margin, y);
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    var today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    doc.text("Prepared " + today, margin, y);
    y += 24;
    doc.setTextColor(20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Property", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Address: " + data.address, margin, y);
    y += 15;
    if (data.clientName) {
      doc.text("Client: " + data.clientName, margin, y);
      y += 15;
    }
    doc.text("Submitted by: " + data.reportEmail, margin, y);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Soffit & Fascia", margin, y);
    y += 6;
    y = doc.autoTable ? y : y;
    doc.autoTable({
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [26, 79, 176] },
      head: [["Item", "Answer"]],
      body: [
        ["Soffit", data.soffitType],
        ["Existing soffit intake", data.soffitIntake],
        ["Gable vents", data.gableVents],
        ["Fascia damage / rot", data.fasciaDamage],
        ["Drip edge existing", data.dripEdge]
      ]
    });
    y = doc.lastAutoTable.finalY + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Roof Basics", margin, y);
    doc.autoTable({
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [26, 79, 176] },
      head: [["Item", "Answer"]],
      body: [
        ["Roof type", data.roofType],
        ["Stories", data.stories]
      ]
    });
    y = doc.lastAutoTable.finalY + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Existing Roof Components", margin, y);
    var componentBody = data.components.length
      ? data.components.map(function (c) { return [c.name, c.present, c.detail]; })
      : [["None recorded", "-", "-"]];
    doc.autoTable({
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [26, 79, 176] },
      head: [["Component", "Present", "Detail"]],
      body: componentBody
    });
    y = doc.lastAutoTable.finalY + 20;

    if (data.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Additional Notes", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      var lines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
      doc.text(lines, margin, y);
    }

    return doc;
  }

  function fileNameFor(data) {
    var safeAddress = (data.address || "report").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
    var dateStr = new Date().toISOString().slice(0, 10);
    return "Roof-Inspection-" + (safeAddress || "report") + "-" + dateStr + ".pdf";
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function isEmailConfigured() {
    var cfg = window.EMAILJS_CONFIG;
    return cfg &&
      cfg.PUBLIC_KEY && cfg.PUBLIC_KEY.indexOf("REPLACE_WITH") !== 0 &&
      cfg.SERVICE_ID && cfg.SERVICE_ID.indexOf("REPLACE_WITH") !== 0 &&
      cfg.TEMPLATE_ID && cfg.TEMPLATE_ID.indexOf("REPLACE_WITH") !== 0;
  }

  function sendReportEmail(data, pdfFile) {
    var cfg = window.EMAILJS_CONFIG;

    var hiddenForm = document.createElement("form");
    hiddenForm.style.display = "none";

    function addField(name, value) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      hiddenForm.appendChild(input);
    }

    addField("to_email", data.reportEmail);
    addField("client_name", data.clientName || "Not recorded");
    addField("address", data.address);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.name = "attachment";
    hiddenForm.appendChild(fileInput);

    var dataTransfer = new DataTransfer();
    dataTransfer.items.add(pdfFile);
    fileInput.files = dataTransfer.files;

    document.body.appendChild(hiddenForm);

    return emailjs.sendForm(cfg.SERVICE_ID, cfg.TEMPLATE_ID, hiddenForm)
      .finally(function () {
        document.body.removeChild(hiddenForm);
      });
  }

  function resetChecklist() {
    form.reset();
    toggleState = {};
    document.querySelectorAll(".toggle.selected").forEach(function (b) { b.classList.remove("selected"); });
    document.querySelectorAll(".hidden-field.visible").forEach(function (el) { el.classList.remove("visible"); });
    document.querySelectorAll(".field-error").forEach(function (el) { el.classList.remove("field-error"); });
  }

  // ---- Submit ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var addressEl = document.getElementById("address");
    var emailEl = document.getElementById("reportEmail");
    var addressVal = addressEl.value.trim();
    var emailVal = emailEl.value.trim();

    var addressOk = addressVal.length > 0;
    var emailOk = isValidEmail(emailVal);
    setFieldError(addressEl, !addressOk);
    setFieldError(emailEl, !emailOk);

    if (!addressOk || !emailOk) {
      setStatus("Enter the address and a valid email before generating the report.", "error");
      (addressOk ? emailEl : addressEl).focus();
      return;
    }

    var data = gatherAnswers();
    var doc = buildPdf(data);
    var filename = fileNameFor(data);
    var blob = doc.output("blob");
    var pdfFile = new File([blob], filename, { type: "application/pdf" });

    if (!isEmailConfigured()) {
      downloadBlob(blob, filename);
      setStatus("EmailJS isn't set up yet, so the PDF just downloaded instead. See README.md to turn on emailing.", "error");
      return;
    }

    submitBtn.disabled = true;
    setStatus("Generating PDF and sending it to " + data.reportEmail + " …", "pending");

    sendReportEmail(data, pdfFile)
      .then(function () {
        setStatus("Report sent to " + data.reportEmail + ".", "success");
        resetChecklist();
      })
      .catch(function (err) {
        console.error("EmailJS send failed:", err);
        downloadBlob(blob, filename);
        setStatus("Couldn't send the email, so the PDF downloaded instead. Check your connection and try again, or share the downloaded file directly.", "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  // ---- Init EmailJS + service worker ----
  if (isEmailConfigured() && window.emailjs) {
    emailjs.init({ publicKey: window.EMAILJS_CONFIG.PUBLIC_KEY });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
