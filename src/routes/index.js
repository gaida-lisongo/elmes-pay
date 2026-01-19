const express = require('express');
const router = express.Router();

const flexRoutes = require('./flexpay.route');
const wonyaPayRoutes = require('./wonyapay.route');
const cinetpayRoutes = require('./cinetpay.route');
const clientRoutes = require('./client.route');
const productRoutes = require('./product.route');
const depenseRoutes = require('./depenses.route');
const recetteRoutes = require('./recettes.route');

router.use('/recettes', recetteRoutes);

// Préfixe toutes les routes Depense avec /depenses
router.use('/depenses', depenseRoutes);

// Préfixe toutes les routes Produit avec /products
router.use('/products', productRoutes);

// Préfixe toutes les routes Client avec /clients
router.use('/clients', clientRoutes);

// Préfixe toutes les routes CinetPay avec /cinetpay
router.use('/cinetpay', cinetpayRoutes);
// Préfixe toutes les routes FlexPay avec /flexpay
router.use('/flexpay', flexRoutes);

router.use('/wonyapay', wonyaPayRoutes);

module.exports = router;