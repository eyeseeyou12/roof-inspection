const nodemailer = require("nodemailer");

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB safety cap; real reports are a few hundred KB
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  var allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    var origin = (event.headers && (event.headers.origin || event.headers.referer)) || "";
    if (origin.indexOf(allowedOrigin) !== 0) {
      return { statusCode: 403, body: "Forbidden" };
    }
  }

  var payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  var to = (payload.to || "").trim();
  var address = (payload.address || "").trim();
  var clientName = (payload.clientName || "Not recorded").trim();
  var filename = (payload.filename || "report.pdf").trim();
  var pdfBase64 = payload.pdfBase64 || "";

  if (!EMAIL_RE.test(to) || !address || !pdfBase64) {
    return { statusCode: 400, body: "Missing or invalid fields" };
  }

  var attachmentBytes = Math.ceil((pdfBase64.length * 3) / 4);
  if (attachmentBytes > MAX_ATTACHMENT_BYTES) {
    return { statusCode: 413, body: "Attachment too large" };
  }

  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  try {
    await transporter.sendMail({
      from: '"Priority Roofing" <' + process.env.GMAIL_USER + ">",
      to: to,
      subject: "Inspection Details - " + address,
      text: "Inspection report attached.\n\nAddress: " + address + "\nClient: " + clientName,
      attachments: [
        {
          filename: filename,
          content: pdfBase64,
          encoding: "base64"
        }
      ]
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    console.error("send-report failed:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Send failed" })
    };
  }
};
