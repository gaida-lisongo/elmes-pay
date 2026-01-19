const mongoose = require('mongoose');

const RecetteSchema = new mongoose.Schema({
    // Le propriétaire de la recette (le marchand)
    clientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Client', 
        required: true 
    },
    // Le produit concerné
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    // Liste des IDs de transactions liées à ce produit pour ce client
    transactions: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Transaction' 
    }],
    // Optionnel : Total cumulé pour éviter de recalculer à chaque fois
    totalRevenueUSD: {
        type: Number,
        default: 0
    },
    totalRevenueCDF: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true 
});

// Index pour accélérer la recherche par client
RecetteSchema.index({ clientId: 1, productId: 1 });

module.exports = mongoose.model('Recette', RecetteSchema);