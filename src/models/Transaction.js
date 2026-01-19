const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    // La devise (ex: "USD", "EUR", "CDF")
    currency: { 
        type: String, 
        required: [true, "La devise est obligatoire"],
        uppercase: true,
        trim: true 
    },
    // ID unique de la commande côté marchand
    orderNumber: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // Le montant net qui arrive dans le système
    amount: { 
        type: Number, 
        required: true,
        min: 0
    },
    // Code de statut ou code de réponse de l'opérateur (ex: 200, 404)
    code: { 
        type: String, 
        default: "TXN_PENDING"
    },
    // Numéro de téléphone du payeur
    phone: { 
        type: String, 
        required: true,
        trim: true
    },
    // Statut interne de la transaction
    status: {
        type: String,
        enum: ['PENDING', 'OK', 'FAILED', 'NO'],
        default: 'PENDING'
    },
    // Date de création automatique
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true // Ajoute automatiquement updatedAt et createdAt
});

module.exports = mongoose.model('Transaction', TransactionSchema);