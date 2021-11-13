const express = require("express");
const connectDB = require("./config/db");
const app = express();
const passport = require("passport");
var cors = require("cors");

app.use(
  cors({
    origins: "*:* http://localhost:* https://* *",
  })
);
require("./passport"); // Passport config
//require("./passport")(passport);
//connectDB
connectDB();
// Init Middleware
app.use("/uploads", express.static("uploads"));
app.use(express.json({ extanded: false }));

//passport middleware intialization
app.use(passport.initialize());
//app.use(passport.session());
//app.use(express.json);

app.get("/", (req, res) => res.send("API running"));
// Define routes
app.use("/api/users", require("./routes/api/users"));
app.use("/api/admin", require("./routes/api/admin"));
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/passwords", require("./routes/api/passwords"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on Port ${PORT}`));
