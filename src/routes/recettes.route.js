const express = require('express');
const router = express.Router();
const Recette = require('../models/Recette');

router.post('/', async (req, res) => {
    try {
        const { clientId, productId } = req.body;
        
        //check if clientId and productId are provided
        if (!clientId || !productId) {
            return res.status(400).json({ success: false, message: "clientId and productId are required" });
        }

        //Check if a recette already exists for the given clientId and productId
        const existingRecette = await Recette.findOne({ clientId, productId, isActive: true });
        if (existingRecette) {
            return res.status(400).json({ success: false, message: "Recette already exists for this client and product", data: existingRecette });
        }

        const newRecette = new Recette({
            clientId,
            productId,
            transactions: [],
            totalRevenueUSD: 0,
            totalRevenueCDF: 0
        });
        const savedRecette = await newRecette.save();
        res.status(201).json({ success: true, message: "Recette created successfully", data: savedRecette });
    } catch (error) {
        console.error("[Create Recette Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const recettes = await Recette.find()
            .populate('clientId', '-password')
            .populate('transactions')
            .populate('productId')
            .where('isActive').equals(true);
        res.status(200).json({ success: true, message: "Recettes retrieved successfully", data: recettes });
    } catch (error) {
        console.error("[Get Recettes Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const recette = await Recette.findById(req.params.id).populate('clientId', '-password').populate('transactions').populate('productId').where('isActive').equals(true);
        if (!recette) {
            return res.status(404).json({ success: false, message: "Recette not found" });
        }

        res.status(200).json({ success: true, message: "Recette retrieved successfully", data: recette });
    } catch (error) {
        console.error("[Get Recette Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedRecette = await Recette.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!deletedRecette) {
            return res.status(404).json({ success: false, message: "Recette not found" });
        }

        res.status(200).json({ success: true, message: "Recette deleted successfully", data: deletedRecette });
    } catch (error) {
        console.error("[Delete Recette Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;