const express = require('express');
const router = express.Router();
const { getPaymentProvider } = require('../utils/pay');
const Transaction = require('../models/Transaction');
const Depense = require('../models/Depense');
const Recette = require('../models/Recette');

// Instance unique pour FlexPay
const flexPay = getPaymentProvider('flexpay');

/**
 * @route   POST /api/flexpay/deposit
 * @desc    Initier un encaissement (Pay-in)
 */
router.post('/deposit', async (req, res) => {
    const { amount, currency, phone, reference, recetteId } = req.body;

    try {
        // On lance le dépôt avec une callback pour enregistrer en DB
        const result = await flexPay.deposit(amount, currency, phone, reference, async (err, response) => {
            if (err) return console.error("[FlexPay Route Error]:", err.message);
            
            const { orderNumber } = response?.data || {};

            // Enregistrement de la transaction en base de données
            if (orderNumber) {
                const newTransaction = new Transaction({
                    currency,
                    orderNumber,
                    amount,
                    code: reference, // À remplir selon votre logique d'authentification
                    phone,
                    status: 'PENDING',
                });
                await newTransaction.save();
                console.log(`[FlexPay Route] Transaction enregistrée: ${orderNumber}`, newTransaction);

                const currentRecette = await Recette.findById(recetteId);
                if (currentRecette) {
                    currentRecette.transactions.push(newTransaction._id);
                    await currentRecette.save();
                    console.log(`[FlexPay Route] Transaction liée à la recette ${recetteId}`);
                }
            }
        });

        res.status(202).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   POST /api/flexpay/withdraw
 * @desc    Initier un retrait (Pay-out)
 */
router.post('/withdraw', async (req, res) => {
    const { amount, currency, phone, reference } = req.body;

    try {
        const result = await flexPay.withdraw(amount, currency, phone, reference, (err, result) => {
            if (err) return console.error("[FlexPay Withdraw Error]:", err.message);
            console.log(`[Retrait] Succès pour ${phone}:`, result);
        });

        res.status(202).json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/transaction', async (req, res) => {
    try {
        const transactionData = req.body;
        console.log(`[FlexPay Transaction Callback] Données reçues:`, transactionData);
        // Ici, vous pouvez enregistrer les données de la transaction dans la base de données
        res.status(200).send('OK')
    } catch (error) {
        console.error(`[FlexPay Transaction Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/flexpay/check/:orderNumber
 * @desc    Vérifier le statut d'une transaction
 */
router.get('/check/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const result = await flexPay.check(orderNumber, async (err, result) => {
            if (err) return console.error("[FlexPay Check Error]:", err.message);
            console.log(`[Vérification] Statut pour ${orderNumber}:`, result);

            const transaction = await Transaction.findOne({ orderNumber });
            if (transaction) {
                const { status, amount, currency } = result.data || {};

                if(transaction.status == 'OK'){
                    console.log(`[FlexPay Check] La transaction ${orderNumber} est déjà marquée comme OK.`);
                    return;
                }

                if (status) {
                    transaction.status = status == '0' ? 'OK' : 'FAILED';
                    await transaction.save();

                    //Finding related depense and updating it
                    const depense = await Depense.find().where('transactions').in([transaction._id]).limit(1);
                    console.log(`depense found for update:`, depense);

                    if (depense.length > 0 && transaction.status === 'OK') {
                        depense[0].totalDepenseUSD += currency === 'USD' ? amount : 0;
                        depense[0].totalDepenseCDF += currency === 'CDF' ? amount : 0;
                        await depense[0].save();
                        console.log(`[FlexPay Check] Depense mise à jour pour la transaction ${orderNumber}`);
                    }

                    const recette = await Recette.find().where('transactions').in([transaction._id]).limit(1);
                    console.log(`recette found for update:`, recette);

                    if (recette.length > 0 && transaction.status === 'OK') {
                        recette[0].totalRevenueUSD += currency === 'USD' ? amount : 0;
                        recette[0].totalRevenueCDF += currency === 'CDF' ? amount : 0;
                        await recette[0].save();
                        console.log(`[FlexPay Check] Recette mise à jour pour la transaction ${orderNumber}`);
                    }
                }
            } 
        });

        res.status(200).json(result);

    } catch (error) {
        console.error(`[FlexPay Route Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/check-balance', async (req, res) => {
    try {
        //Check balance
        const balance = await flexPay.checkBalance();
        res.status(200).json({ success: true, balance });
    } catch (error) {
        console.error(`[FlexPay Route Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        //Check balance
        const balance = await flexPay.checkBalance();
        res.status(200).json({ success: true, balance });
    } catch (error) {
        console.error(`[FlexPay Route Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;