async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Gecersiz JSON gonderildi.");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  if (typeof res.status === "function") {
    return res.status(statusCode).json(payload);
  }
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function handleError(res, error) {
  const statusCode = error.statusCode || 500;
  const message = error.expose === false ? "Sunucu hatasi" : error.message || "Sunucu hatasi";
  return sendJson(res, statusCode, { ok: false, message });
}

module.exports = {
  readJson,
  sendJson,
  handleError
};
