const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const menusRouter = require("./routes/menus");
const tablesRouter = require("./routes/tables");
const ordersRouter = require("./routes/order");

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/menus", menusRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/orders", ordersRouter);

app.listen(PORT, () => console.log("Server connected with port " + PORT));
