const { getRoomState } = require("../../lib/game-service");
const { sendJson, handleError } = require("../../lib/http");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const room = await getRoomState({
      code: url.searchParams.get("code"),
      playerId: url.searchParams.get("playerId")
    });
    sendJson(res, 200, { ok: true, room });
  } catch (error) {
    handleError(res, error);
  }
};
