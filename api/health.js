const { health } = require("../lib/game-service");
const { sendJson, handleError } = require("../lib/http");

module.exports = async function handler(_req, res) {
  try {
    sendJson(res, 200, await health());
  } catch (error) {
    handleError(res, error);
  }
};
