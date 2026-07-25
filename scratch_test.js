const express = require("express");
const app = express();
app.set("view engine", "ejs");
app.get("/", (req, res, next) => {
  try {
    res.render("does-not-exist");
  } catch (e) {
    console.log("CAUGHT SYNCHRONOUSLY:", e.message);
    res.send("CAUGHT");
  }
});
app.use((err, req, res, next) => {
  console.log("CAUGHT ASYNCHRONOUSLY / IN ERROR HANDLER:", err.message);
  res.send("ERROR HANDLER");
});
app.listen(3001, () => console.log("Listening"));
