const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();
const routes = require('./routes');
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json()); // Pour lire le JSON
app.use(bodyParser.urlencoded({ extended: true })); // Pour les formulaires

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/elmespay';

mongoose.connect(MONGO_URI)
    .then(() => console.log('🌱 Connecté à la base de données MongoDB'))
    .catch(err => console.error('❌ Erreur de connexion MongoDB:', err));

// Exemple de route sécurisée avec JWT
app.post('/api/pay', (req, res) => {
    // Dans un vrai cas, on vérifierait le Token JWT ici
    const data = req.body;
    res.json({
        message: "Données de paiement reçues",
        received: data
    });
});

// Route pour générer une facture PDF (test pdfmake)
app.get('/api/invoice', (req, res) => {
    // Logique de génération PDF à venir ici
    res.send("Facture en cours de génération...");
});

app.use('/api/v1', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ ElmesPay Backend avec JWT & PDFMake sur le port ${PORT}`);
});