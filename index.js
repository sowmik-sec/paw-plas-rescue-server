const express = require("express");
const app = express();
var cors = require("cors");
require("dotenv").config();
const port = 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Paw pals rescue server is running");
});

app.listen(port, () => {
  console.log(`Paw pals rescue server is listening on port ${port}`);
});
