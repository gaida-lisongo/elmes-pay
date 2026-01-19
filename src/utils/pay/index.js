const FlexPayService = require('./FlexPayService');
const CinetPayService = require('./CinetPayService');
const WonyaPayService = require('./WonyaPayService');

/**
 * PayFactory & Instanciateur
 * Centralise la création des services de paiement
 */
class PayFactory {
    static getService(provider) {
        if (!provider) {
            throw new Error("Le fournisseur de paiement (provider) est requis");
        }

        switch (provider.toLowerCase()) {
            case 'flexpay':
                return FlexPayService; // Instance singleton directe
            case 'cinetpay':
                return new CinetPayService();
            case 'wonyapay':
                return new WonyaPayService();
            default:
                throw new Error(`Le fournisseur [${provider}] n'est pas supporté par ElmesPay`);
        }
    }
}

/**
 * Fonction exportée pour être utilisée dans les controllers.
 * Elle garantit que l'on récupère toujours une instance valide.
 */
const getPaymentProvider = (providerName) => {
    try {
        return PayFactory.getService(providerName);
    } catch (error) {
        console.error(`[PayFactory Error]: ${error.message}`);
        return null;
    }
};

// Middleware to proccess file 



module.exports = { getPaymentProvider};