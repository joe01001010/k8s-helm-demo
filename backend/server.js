const express = require("express");
const os = require("os");

const app = express();
const port = process.env.PORT || 3000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from the backend container",
    hostname: os.hostname(),
    time: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
