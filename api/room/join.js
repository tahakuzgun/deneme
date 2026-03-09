const { joinRoom } = require("../../lib/game-service");
const { readJson, sendJson, handleError } = require("../../lib/http");

module.exports = async function handler(req, res) {
  try {
    const body = await readJson(req);
    const result = await joinRoom({ code: body.code, name: body.name });
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    handleError(res, error);
  }
};
