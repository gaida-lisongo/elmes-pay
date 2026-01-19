const express = require('express');
const router = express.Router();
const { getPaymentProvider } = require('../utils/pay');
const Transaction = require('../models/Transaction');

const crypto = require('crypto');
const cinetPay = getPaymentProvider('cinetpay');

/**
 * @route   POST /api/cinetpay/pay
 * @desc    Initier un paiement via CinetPay
 */
router.post('/deposit', async (req, res) => {
    try {
        const { 
            customer_id,
            customer_name,
            customer_surname,
            customer_email,
            customer_phone,
            customer_country,
            customer_city,
            customer_address,
            customer_state,
            customer_zip_code,
            amount,
            currency,
            description,
            type
         } = req.body;

        const customerData = {
            id: customer_id,
            name: customer_name,
            surname: customer_surname,
            email: customer_email,
            phone: customer_phone,
            country: customer_country,
            city: customer_city,
            address: customer_address,
            state: customer_state,
            zipCode: customer_zip_code,
        };



        const transactionId = crypto.randomBytes(16).toString('hex');
        console.log(`[CinetPay Deposit] Généré Transaction ID: ${transactionId}`);

        const result = await cinetPay.deposit(customerData, amount, currency, transactionId, description, type, (err, data) => {
            if (err) return console.error("[CinetPay Deposit Error]:", err.message);
            console.log(`[CinetPay Deposit Callback] Succès pour ${customer_phone}:`, data);
        });

        res.status(202).json(result);
    } catch (error) {
        console.error("[CinetPay Deposit Route Error]:", error.message);
        res.status(500).json({ success: false, error: error.message });        
    }


});

router.post('/withdraw', async (req, res) => {});

router.post('/transaction', async (req, res) => {
    try {
        const transactionData = req.body;
        console.log(`[CinetPay Transaction Callback] Données reçues:`, transactionData);
        // Ici, vous pouvez enregistrer les données de la transaction dans la base de données
        res.status(200).send('OK')
    } catch (error) {
        console.error(`[CinetPay Transaction Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/check', async (req, res) => {
    try {
        const { transaction_id, type } = req.body;
        const result = await cinetPay.check(transaction_id, type, (err, data) => {
            if (err) return console.error("[CinetPay Check Error]:", err.message);
            console.log(`[CinetPay Check Callback] Statut pour ${transaction_id}:`, data);
        });
        res.status(200).json(result);
    } catch (error) {
        console.error(`[CinetPay Check Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
