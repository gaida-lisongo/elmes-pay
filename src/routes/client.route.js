const express = require('express');
const router = express.Router();
const { Client, KYC } = require('../models/Client');
const crypto = require('crypto');
const secure = require('../utils/secure/TokenManager');
const mongoose = require('mongoose');
const upload = require('../utils/storage/upload');
const fs = require('fs');
const megaService = require('../utils/storage/mega');
const cloudinaryService = require('../utils/storage/cloudinary');
//Create a new client
router.post('/', async (req, res) => {
    try {
        const { userName, email, password, phone } = req.body;

        //Check if email or phone already exists
        const existingClient = await Client.findOne({ $or: [{ email }, { phone }] });
        if (existingClient) {
            return res.status(400).json({ success: false, message: "Email or phone already in use" });
        }

        const newClient = new Client({
            userName,
            email,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            phone,
            chats: [],
            soldeUSD: 0,
            soldeCDF: 0
        });
        const savedClient = await newClient.save();

        const clientWihoutPassword = savedClient.toObject();
        delete clientWihoutPassword.password;
        
        res.status(201).json({ success: true, message: "Client created successfully", data: clientWihoutPassword });

    } catch (error) {
        console.error("[Create Client Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//Update client info
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid client ID format" });
        }

        if (updateData.password) {
            updateData.password = crypto.createHash('sha256').update(updateData.password).digest('hex');
        }

        const updatedClient = await Client.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedClient) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        res.status(200).json({ success: true, message: "Client updated successfully", data: updatedClient });
        
    } catch (error) {
        console.error("[Update Client Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//Delete a client
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClient = await Client.findByIdAndDelete(id);

        if (!deletedClient) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        res.status(200).json({ success: true, message: "Client deleted successfully", data: deletedClient });
        
    } catch (error) {
        console.error("[Delete Client Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//Get client by Auth
router.patch('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        const client = await Client.findOne({ email, password: hashedPassword });
        if (!client) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        //Generate a token
        const token = secure.tokenManager.generateToken({ id: client._id, email: client.email });
        res.status(200).json({ success: true, message: "Login successful", data: {client, token} });
        
    } catch (error) {
        console.error("[Client Login Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   PATCH /api/clients/photo/:id
 * @desc    Mettre à jour la photo de profil (JPG/PNG)
 */
router.patch('/photo/:id', upload.single('photo'), async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        
        // Suppression de l'ancienne photo si elle existe
        if (client.photo) {
            await cloudinaryService.deleteByUrl(client.photo);
        }

        // Upload via fetch
        const uploadResult = await cloudinaryService.upload(req.file.path);
        
        client.photo = uploadResult.secure_url;
        await client.save();

        fs.unlinkSync(req.file.path);
        res.json({ success: true, data: client });
    } catch (error) {
        console.error("[Upload Client Photo Error]:", error);
        if (req.file) fs.unlinkSync(req.file.path); // Sécurité : supprimer même si erreur
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   PATCH /api/clients/kyc/:id
 * @desc    Uploader le document d'identité (PDF)
 */
router.patch('/kyc/:id', upload.single('kyc'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ success: false, message: "Document KYC requis" });

        // On utilise la même logique Singleton
        const fileNode = await megaService.upload(req.file.path);
        const megaUrl = await megaService.getLink(fileNode);

        console.log(`[KYC Upload] Fichier uploadé sur Mega: ${megaUrl}`);
        
        const newKYC = await KYC.create({
            clientId: id,
            documentUrl: megaUrl,
            documentType: req.file.mimetype,
            documentNumber: new Date().getTime().toString(),
        })



        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: "Document KYC enregistré", data: newKYC });
    } catch (error) {
        console.error("[Upload Client KYC Error]:", error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/chat/create/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const {
            subject,
            type,
            content
        } = req.body;

        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }
        //Check if a chat with the same subject already exists
        const existingChat = client.chats.find(chat => chat.subject === subject);
        if (existingChat) {
            return res.status(400).json({ success: false, message: "Chat with this subject already exists" });
        }

        const newChat = {
            subject,
            status: 'ouvert',
            messages: [{
                type,
                content
            }]
        };

        client.chats.push(newChat);
        await client.save();
        res.status(200).json({ success: true, message: "Chat message added", data: client });
    } catch (error) {
        console.error("[Create Chat Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/chat/message/:clientId/:chatId', async (req, res) => {
    try {
        const { clientId, chatId } = req.params;
        const {
            type,
            content
        } = req.body;
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }

        const chat = client.chats.id(chatId);
        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        chat.messages.push({ type, content });
        await client.save();
        res.status(200).json({ success: true, message: "Chat message added", data: client });
    } catch (error) {
        console.error("[Add Chat Message Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//Get clients by criteria
router.get('/', async (req, res) => {
    try {
        const criteria = req.query || {};
        const {
            userName, email, phone, _id, soldeUSD, soldeCDF
        } = criteria;

        let query = {};
        if (userName) query.userName = new RegExp(userName, 'i');
        if (email) {
            // Recherche partielle avec regex (LIKE en SQL)
            const escapedEmail = email.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.email = new RegExp(escapedEmail, 'i');
        }
        if (phone) {
            // Recherche partielle avec regex (LIKE en SQL)
            let phoneNumber = phone.toString().trim();
            if (phoneNumber.startsWith(' ')) {
                phoneNumber = '+' + phoneNumber.trim();
            }
            // Échapper les caractères spéciaux et utiliser une recherche partielle
            const escapedPhone = phoneNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.phone = new RegExp(escapedPhone, 'i');
        }
        if (_id && mongoose.Types.ObjectId.isValid(_id)) query._id = _id;
        if (soldeUSD) query.soldeUSD = { $gte: Number(soldeUSD) };
        if (soldeCDF) query.soldeCDF = { $gte: Number(soldeCDF) };
        //Erase password from results
        const clients = await Client.find(query).select('-password');


        res.status(200).json({ success: true, data: clients });
        
    } catch (error) {
        console.error("[Get Clients Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = router;