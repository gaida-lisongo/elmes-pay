const express = require('express');
const router = express.Router();
const { getPaymentProvider } = require('../utils/pay');
const Transaction = require('../models/Transaction');
const Recette = require('../models/Recette');
const Depense = require('../models/Depense');
const wonyaPay = getPaymentProvider('wonyapay');

/**
 * @route   POST /api/wonyapay/deposit
 * @desc    Initier un encaissement (Pay-in)
 */
router.post('/deposit', async (req, res) => {
    const { amount, currency, phone, motif, recetteId } = req.body;
    try {
        // On lance le dépôt avec une callback pour enregistrer en DB
        const result = await wonyaPay.deposit(phone, amount, currency, motif, async (err, response) => {
            if (err) return console.error("[WonyaPay Deposit Error]:", err.message);
            const { documentId, refTransa } = response?.data || {};

            if(refTransa){
                const newTransaction = new Transaction({
                    currency,
                    orderNumber: refTransa,
                    amount,
                    code: documentId, // À remplir selon votre logique d'authentification
                    phone,
                    status: 'PENDING',
                });

                await newTransaction.save()
                console.log(`[WonyaPay Route] Transaction enregistrée: ${refTransa}`, newTransaction);

                const currentRecette = await Recette.findById(recetteId);

                if (currentRecette) {
                    currentRecette.transactions.push(newTransaction._id);
                    await currentRecette.save();
                    console.log(`[WonyaPay Route] Transaction liée à la recette ${recetteId}`);
                }
            }
        });

        res.json(result);
    } catch (error) {
        console.error("[WonyaPay Deposit Error]:", error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/transaction', async (req, res) => {
    try {
        const transactionData = req.body;
        console.log(`[WonyaPay Transaction Callback] Données reçues:`, transactionData);
        // Ici, vous pouvez enregistrer les données de la transaction dans la base de données
        res.status(200).send('OK');

    } catch (error) {
        console.error(`[WonyaPay Transaction Error]:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/check-payment', async (req, res) => {
    const { orderNumber } = req.body;
    try {
        let result;
        await wonyaPay.check(orderNumber, async (err, response) => {
            if (err) return console.error("[WonyaPay Check Payment Error]:", err.message);

            const transaction = await Transaction.findOne({ orderNumber });

            if (transaction) {
                if (transaction.status === 'OK') {
                    console.log(`[WonyaPay Check Payment] Transaction déjà marquée comme OK: ${orderNumber}`);
                    return;
                }

                if(response.StatutTransa != 'Succes') {
                    transaction.status = 'OK';
                    await transaction.save();
                    console.log(`[WonyaPay Check Payment] Transaction mise à jour en OK: ${orderNumber}`);

                    //Finding related depense and updating it
                    const depense = await Depense.find().where('transactions').in([transaction._id]).limit(1);

                    if (depense.length > 0 && transaction.status === 'OK') {
                        depense[0].totalDepenseUSD += transaction.currency === 'USD' ? transaction?.amount : 0;
                        depense[0].totalDepenseCDF += transaction.currency === 'CDF' ? transaction?.amount : 0;
                        await depense[0].save();
                        console.log(`[FlexPay Check] Depense mise à jour pour la transaction ${orderNumber}`);
                    }

                    const recette = await Recette.find().where('transactions').in([transaction._id]).limit(1);

                    if (recette.length > 0 && transaction.status === 'OK') {
                        recette[0].totalRevenueUSD += transaction.currency === 'USD' ? transaction?.amount : 0;
                        recette[0].totalRevenueCDF += transaction.currency === 'CDF' ? transaction?.amount : 0;
                        await recette[0].save();
                        console.log(`[FlexPay Check] Recette mise à jour pour la transaction ${orderNumber}`);
                    }
                }
            }

            result = response;
        });

        res.json(result);
    } catch (error) {
        console.error("[WonyaPay Check Payment Error]:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/wonyapay/withdraw
 * @desc    Initier un retrait (Pay-out)
 */
router.post('/withdraw', async (req, res) => {
    const { amount, currency, phone, userName, motif } = req.body;
    try {
        // On lance le retrait avec une callback pour enregistrer en DB
        const result = await wonyaPay.withdraw(phone, amount, currency, userName, motif, (err, data) => {
            if (err) return console.error("[WonyaPay Withdraw Error]:", err.message);
            console.log(`data`, data);
        });
        res.json(result);
    } catch (error) {
        console.error("[WonyaPay Withdraw Error]:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;