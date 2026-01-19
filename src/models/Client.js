const mongoose = require('mongoose');

// Sous-schéma pour les messages individuels
const MessageSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['quiz', 'resp'], 
        required: true 
    },
    content: { type: String, required: true },
    assets: [{
        file: { type: String }, // URL du fichier (S3, Cloudinary, etc.)
        type: { type: String }  // image, pdf, etc.
    }],
    voice: { type: String }, // URL du fichier audio
    status: { 
        type: String, 
        enum: ['Vu', 'Non Vu'], 
        default: 'Non Vu' 
    },
    sentAt: { type: Date, default: Date.now }
});

const KYCSchema = new mongoose.Schema({
    documentType: { type: String, required: true }, // e.g., "passport", "ID card"
    documentNumber: { type: String, required: true },
    documentUrl: { type: String, required: true }, // URL to the uploaded document
    issuedDate: { type: Date },
    expiryDate: { type: Date },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }
});

// Sous-schéma pour les fils de discussion (chats)
const ChatSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['ouvert', 'fermé'], 
        default: 'ouvert' 
    },
    messages: [MessageSchema]
});

// Schéma Principal du Client
const ClientSchema = new mongoose.Schema({
    userName: { type: String, required: true, trim: true },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    password: { type: String, required: true }, // Sera haché plus tard
    photo: { type: String, default: 'default-avatar.png' },
    phone: { type: String, required: true },
    
    // Messagerie intégrée
    chats: [ChatSchema],
    // Portefeuilles Multi-devises
    soldeUSD: { type: Number, default: 0, min: 0 },
    soldeCDF: { type: Number, default: 0, min: 0 }
    
}, { timestamps: true });

const Client = mongoose.model('Client', ClientSchema);
const KYC = mongoose.model('KYC', KYCSchema);

module.exports = {
    Client,
    KYC
};