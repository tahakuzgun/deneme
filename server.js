const path = require("path");
const express = require("express");

const healthHandler = require("./api/health");
const lobbyHandler = require("./api/lobby");
const createRoomHandler = require("./api/room/create");
const joinRoomHandler = require("./api/room/join");
const stateHandler = require("./api/room/state");
const startHandler = require("./api/room/start");
const restartVoteHandler = require("./api/room/restart-vote");
const actionHandler = require("./api/room/action");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/api/health", healthHandler);
app.get("/api/lobby", lobbyHandler);
app.post("/api/room/create", createRoomHandler);
app.post("/api/room/join", joinRoomHandler);
app.get("/api/room/state", stateHandler);
app.post("/api/room/start", startHandler);
app.post("/api/room/restart-vote", restartVoteHandler);
app.post("/api/room/action", actionHandler);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
