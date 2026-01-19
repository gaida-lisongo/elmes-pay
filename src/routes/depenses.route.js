const express = require('express');
const router = express.Router();
const Depense = require('../models/Depense');

router.post('/', async (req, res) => {
    try {
        const { clientId, note } = req.body;

        const newDepense = new Depense({
            clientId,
            note,
            transactions: [],
            totalDepenseUSD: 0,
            totalDepenseCDF: 0
        });

        const savedDepense = await newDepense.save();
        res.status(201).json({ success: true, message: "Depense created successfully", data: savedDepense });

    } catch (error) {
        console.error("[Create Depense Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const depenses = await Depense.find().populate('clientId', '-password').populate('transactions').where('isActive').equals(true);
        res.status(200).json({ success: true, message: "Depenses retrieved successfully", data: depenses });
    } catch (error) {
        console.error("[Get Depenses Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const depense = await Depense.findById(req.params.id).populate('clientId', '-password').populate('transactions').where('isActive').equals(true);
        if (!depense) {
            return res.status(404).json({ success: false, message: "Depense not found" });
        }

        res.status(200).json({ success: true, message: "Depense retrieved successfully", data: depense });
    } catch (error) {
        console.error("[Get Depense Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedDepense = await Depense.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedDepense) {
            return res.status(404).json({ success: false, message: "Depense not found" });
        }
        res.status(200).json({ success: true, message: "Depense updated successfully", data: updatedDepense });
    } catch (error) {
        console.error("[Update Depense Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedDepense = await Depense.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!deletedDepense) {
            return res.status(404).json({ success: false, message: "Depense not found" });
        }

        res.status(200).json({ success: true, message: "Depense deleted successfully" });
    } catch (error) {
        console.error("[Delete Depense Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;