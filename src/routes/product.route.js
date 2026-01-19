const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.post('/', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json({ success: true, message: "Product created successfully", data: savedProduct });
    } catch (error) {
        console.error("[Create Product Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        let query = {};
        const searchParams = req.query;
        
        if (searchParams) {
            if (searchParams.description) {
                query.description = { $regex: searchParams.description, $options: 'i' };
            }

            if (searchParams.amount) {
                query.amount = { $eq: Number(searchParams.amount) };
            }

            if (searchParams.reference) {
                query.reference = { $regex: searchParams.reference, $options: 'i' };
            }

            if (searchParams.description) {
                query.description = { $regex: searchParams.description, $options: 'i' };
            }
            
            if(searchParams.currency){
                query.currency = { $eq: searchParams.currency };
            }
        }

        const products = await Product.find(query).populate('clientId', '-password').where('isActive').equals(true);
        res.status(200).json({ success: true, message: "Products retrieved successfully", data: products });
    } catch (error) {
        console.error("[Get Products Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('clientId', '-password').where('isActive').equals(true);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, message: "Product retrieved successfully", data: product });
    } catch (error) {
        console.error("[Get Product Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product updated successfully", data: updatedProduct });
    } catch (error) {
        console.error("[Update Product Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("[Delete Product Error]:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;