(function () {
  "use strict";

  var SEND_ENDPOINT = "/.netlify/functions/send-report";
  var STORAGE_KEY = "roofAssessmentDraft";

  var FIELD_IDS = [
    "address", "clientName", "reportEmail", "notes", "roofTypeOther",
    "leakLocation", "leakCause", "collMiscDesc",
    "qtyBoxVents", "qtyTurtleVent", "qtyRidgeVent",
    "qtyRainCaps35", "qtyRainCaps6",
    "qtyPipeJacks15", "qtyPipeJacks2", "qtyPipeJacks3",
    "qtyBathroomVent", "qtyDryerVent", "qtySatelliteDish", "qtyRoofIntakeVent",
    "otherDesc", "qtyOther",
    "windQtyLeft", "hailQtyLeft", "windQtyRight", "hailQtyRight",
    "windQtyFront", "hailQtyFront", "windQtyBack", "hailQtyBack"
  ];

  var CHECKBOX_IDS = [
    "checkBoxVents", "checkTurtleVent", "checkRidgeVent", "checkRainCaps",
    "checkPipeJacks", "checkBathroomVent", "checkDryerVent", "checkSatelliteDish",
    "checkRoofIntakeVent", "checkChimney", "checkOther"
  ];

  var form = document.getElementById("inspection-form");
  var submitBtn = document.getElementById("submit-btn");
  var resetBtn = document.getElementById("reset-btn");
  var statusMsg = document.getElementById("status-msg");

  var toggleState = {}; // name -> selected value

  // ---- Draft persistence (per-device, via localStorage) ----
  function saveDraft() {
    var fields = {};
    FIELD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) fields[id] = el.value;
    });
    var checks = {};
    CHECKBOX_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) checks[id] = el.checked;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ toggleState: toggleState, fields: fields, checks: checks }));
    } catch (err) {
      // localStorage unavailable (private browsing, full, etc.) - draft persistence just won't work
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
  }

  function restoreDraft() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (err) { return; }
    if (!raw) return;
    var draft;
    try { draft = JSON.parse(raw); } catch (err) { return; }

    toggleState = draft.toggleState || {};
    Object.keys(toggleState).forEach(function (name) {
      var group = document.querySelector('.toggle-group[data-name="' + name + '"]');
      if (!group) return;
      var btn = group.querySelector('.toggle[data-value="' + toggleState[name] + '"]');
      if (btn) {
        btn.classList.add("selected");
        onToggleChanged(name, toggleState[name]);
      }
    });

    Object.keys(draft.fields || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = draft.fields[id];
    });

    Object.keys(draft.checks || {}).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && draft.checks[id]) {
        el.checked = true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

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
      saveDraft();
    });
  });

  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);

  function onToggleChanged(name, value) {
    if (name === "roofType") {
      var other = document.getElementById("roofTypeOther");
      other.classList.toggle("visible", value === "Other");
      if (value !== "Other") other.value = "";
      return;
    }

    if (name === "activeLeak") {
      document.getElementById("leakDetails").classList.toggle("visible", value === "Yes");
      return;
    }

    if (name === "collMisc") {
      document.getElementById("collMiscDesc").classList.toggle("visible", value === "Yes");
      return;
    }

    if (/^wind[A-Z]/.test(name)) {
      var windQty = document.getElementById("windQty" + name.slice(4));
      if (windQty) windQty.classList.toggle("visible", value === "Yes");
      return;
    }

    if (/^hail[A-Z]/.test(name)) {
      var hailQty = document.getElementById("hailQty" + name.slice(4));
      if (hailQty) hailQty.classList.toggle("visible", value === "Yes");
      return;
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

    var activeLeak = toggleState.activeLeak || "Not recorded";
    var leakLocation = document.getElementById("leakLocation").value.trim();
    var leakCause = document.getElementById("leakCause").value.trim();

    var slopes = ["Left", "Right", "Front", "Back"].map(function (slope) {
      var wind = toggleState["wind" + slope] || "Not recorded";
      var hail = toggleState["hail" + slope] || "Not recorded";
      var windQty = document.getElementById("windQty" + slope).value.trim();
      var hailQty = document.getElementById("hailQty" + slope).value.trim();
      return {
        slope: slope,
        wind: wind,
        windQty: wind === "Yes" && windQty ? windQty : "-",
        hail: hail,
        hailQty: hail === "Yes" && hailQty ? hailQty : "-"
      };
    });

    var collMiscValue = toggleState.collMisc || "Not recorded";
    var collMiscDesc = document.getElementById("collMiscDesc").value.trim();
    var collateral = [
      { name: "Window screens", value: toggleState.collWindowScreens || "Not recorded" },
      { name: "Window aluminum/vinyl trim", value: toggleState.collWindowTrim || "Not recorded" },
      { name: "Siding damage", value: toggleState.collSiding || "Not recorded" },
      { name: "Garage door", value: toggleState.collGarageDoor || "Not recorded" },
      { name: "AC unit screen", value: toggleState.collACScreen || "Not recorded" },
      { name: "Other" + (collMiscValue === "Yes" && collMiscDesc ? " (" + collMiscDesc + ")" : ""), value: collMiscValue }
    ];

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
      components: components,
      activeLeak: activeLeak,
      leakLocation: activeLeak === "Yes" && leakLocation ? leakLocation : "-",
      leakCause: activeLeak === "Yes" && leakCause ? leakCause : "-",
      slopes: slopes,
      collateral: collateral
    };
  }

  // ---- PDF generation ----
  function buildPdf(data) {
    var jsPDFCtor = window.jspdf.jsPDF;
    var doc = new jsPDFCtor({ unit: "pt", format: "letter" });
    var margin = 48;
    var y = margin;
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();

    function ensureSpace(minRemaining) {
      if (y + minRemaining > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Roof Assessment Details", margin, y);
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

    ensureSpace(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Active Leak", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Active leak: " + data.activeLeak, margin, y);
    y += 15;
    if (data.activeLeak === "Yes") {
      doc.text("Location: " + data.leakLocation, margin, y);
      y += 15;
      doc.text("Cause: " + data.leakCause, margin, y);
      y += 15;
    }
    y += 9;

    ensureSpace(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Soffit & Fascia", margin, y);
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

    ensureSpace(50);
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

    ensureSpace(50);
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

    ensureSpace(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Storm Damage", margin, y);
    doc.autoTable({
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [26, 79, 176] },
      head: [["Slope", "Wind Damage", "Wind-Damaged Shingles (Qty)", "Hail Damage", "Hail Hits (Test Square)"]],
      body: data.slopes.map(function (s) {
        return [s.slope, s.wind, s.windQty, s.hail, s.hailQty];
      })
    });
    y = doc.lastAutoTable.finalY + 20;

    ensureSpace(50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Collateral Damage", margin, y);
    doc.autoTable({
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [26, 79, 176] },
      head: [["Item", "Damage"]],
      body: data.collateral.map(function (c) {
        return [c.name, c.value];
      })
    });
    y = doc.lastAutoTable.finalY + 20;

    if (data.notes) {
      ensureSpace(50);
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
    return "Roof-Assessment-" + (safeAddress || "report") + "-" + dateStr + ".pdf";
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

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        resolve(String(reader.result).split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function sendReportEmail(data, pdfFile) {
    return blobToBase64(pdfFile).then(function (pdfBase64) {
      return fetch(SEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.reportEmail,
          address: data.address,
          clientName: data.clientName || "Not recorded",
          filename: pdfFile.name,
          pdfBase64: pdfBase64
        })
      }).then(function (res) {
        if (res.ok) return;
        return res.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.error || ("Send failed (" + res.status + ")"));
        });
      });
    });
  }

  function resetChecklist() {
    form.reset();
    toggleState = {};
    document.querySelectorAll(".toggle.selected").forEach(function (b) { b.classList.remove("selected"); });
    document.querySelectorAll(".hidden-field.visible").forEach(function (el) { el.classList.remove("visible"); });
    document.querySelectorAll(".field-error").forEach(function (el) { el.classList.remove("field-error"); });
    clearDraft();
  }

  resetBtn.addEventListener("click", function () {
    if (!window.confirm("Clear everything you've entered and start a new checklist?")) return;
    resetChecklist();
    setStatus("Checklist cleared.", "pending");
  });

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

    submitBtn.disabled = true;
    setStatus("Generating PDF and sending it to " + data.reportEmail + " …", "pending");

    sendReportEmail(data, pdfFile)
      .then(function () {
        setStatus("Report sent to " + data.reportEmail + ".", "success");
        resetChecklist();
      })
      .catch(function (err) {
        console.error("Send failed:", err);
        downloadBlob(blob, filename);
        setStatus("Couldn't send the email, so the PDF downloaded instead. Check your connection and try again, or share the downloaded file directly.", "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });

  // ---- Restore any in-progress draft from this device ----
  restoreDraft();

  // ---- Service worker ----
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
