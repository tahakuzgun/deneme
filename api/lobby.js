const { listOpenRooms } = require("../lib/game-service");
const { sendJson, handleError } = require("../lib/http");

module.exports = async function handler(_req, res) {
  try {
    sendJson(res, 200, { ok: true, rooms: await listOpenRooms() });
  } catch (error) {
    handleError(res, error);
  }
};
