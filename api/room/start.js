const { startRoom } = require("../../lib/game-service");
const { readJson, sendJson, handleError } = require("../../lib/http");

module.exports = async function handler(req, res) {
  try {
    const body = await readJson(req);
    const room = await startRoom({ code: body.code, playerId: body.playerId });
    sendJson(res, 200, { ok: true, room });
  } catch (error) {
    handleError(res, error);
  }
};
