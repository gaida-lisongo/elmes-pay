const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    // Nom ou titre du produit/service
    designation: { 
        type: String, 
        required: [true, "La désignation est obligatoire"], 
        trim: true 
    },
    // Prix unitaire
    amount: { 
        type: Number, 
        required: true, 
        min: [0, "Le montant ne peut pas être négatif"] 
    },
    // Devise (USD, CDF, etc.)
    currency: { 
        type: String, 
        required: true, 
        uppercase: true,
        default: 'USD'
    },
    // Référence au Client qui possède ce produit
    // On utilise ObjectId pour pouvoir faire des "populations" (jointures)
    clientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Client', 
        required: true 
    },
    // Référence unique du produit (SKU ou code barre)
    reference: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    // Détails supplémentaires sur le produit
    description: { 
        type: String, 
        trim: true 
    },
    // État du produit (pour pouvoir le désactiver sans le supprimer)
    isActive: {
        type: Boolean,
        default: true
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Product', ProductSchema);