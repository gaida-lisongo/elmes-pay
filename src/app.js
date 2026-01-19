const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const routes = require("./routes");

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.post("/api/pay", (req, res) => {
    res.json({
        message: "Données de paiement reçues",
        received: req.body,
    });
});

app.get("/api/invoice", (req, res) => {
    res.send("Facture en cours de génération...");
});

app.use("/api/v1", routes);

module.exports = app;
