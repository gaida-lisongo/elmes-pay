const mongoose = require('mongoose');

const DepenseSchema = new mongoose.Schema({
    // Le client qui effectue la dépense
    clientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Client', 
        required: true 
    },
    // Liste des IDs de transactions marquant une sortie d'argent
    transactions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Transaction' 
    }],
    // Cumul des dépenses par devise
    totalDepenseUSD: {
        type: Number,
        default: 0,
        min: 0
    },
    totalDepenseCDF: {
        type: Number,
        default: 0,
        min: 0
    },
    // Note optionnelle (ex: "Retrait mensuel", "Frais de maintenance")
    note: {
        type: String,
        trim: true
    },

    isActive: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true 
});

// Indexation pour retrouver rapidement les dépenses d'un client
DepenseSchema.index({ clientId: 1 });

module.exports = mongoose.model('Depense', DepenseSchema);