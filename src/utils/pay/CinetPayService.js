const ServicePay = require('./ServicePay');

class CinetPayService extends ServicePay {
    constructor(){
        super();
        this.apiKey = process.env.CINETPAY_API_KEY;
        this.apiOutEndpoint = process.env.CINETPAY_OUT;
        this.apiInEndpoint = process.env.CINETPAY_IN;
        this.siteIdCdf = process.env.CINETPAY_SITE_ID_CDF;
        this.secretKeyCdf = process.env.CINETPAY_SECRET_KEY_CDF;
        this.siteIdUsd = process.env.CINETPAY_SITE_ID_USD;
        this.secretKeyUsd = process.env.CINETPAY_SECRET_KEY_USD;
        this.callbackUrl = 'http://localhost:3000/api/v1/cinetpay/transaction'; // A remplacer par l'URL de votre application

    }

    async createCardPayment(customerData, amount, currency, transactionId, description) {
        try {
            const payload = {
                apikey: this.apiKey,
                site_id: currency === 'USD' ? this.siteIdUsd : this.siteIdCdf,
                alternative_currency: currency === 'USD' ? 'CDF' : 'USD',
                transaction_id: transactionId,
                amount: amount,
                currency: currency,
                description: description,
                channels: "CREDIT_CARD",
                customer_id: customerData.id,
                customer_name: customerData.name,
                customer_surname: customerData.surname,
                customer_email: customerData.email,
                customer_phone_number: customerData.phone,
                customer_address: customerData.address || '',
                customer_city: customerData.city || '',
                customer_country: customerData.country || '',
                customer_state: customerData.state || '',
                customer_zip_code: customerData.zipCode || '',
                notify_url: this.callbackUrl,
                return_url: this.callbackUrl,
                metadata: customerData.metadata || '',
                lang: "FR",
            };

            const config = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            };

            console.log(`[CinetPay] Création paiement par carte...`, config);
            
            const request = await fetch(`${this.apiInEndpoint}`, config);
            
            if(!request.ok){
                console.error("[CinetPay Create Payment Error]: Réponse non OK de l'API", request.statusText);
                throw new Error(`Erreur API CinetPay: ${request?.status}`);
            }

            const {
                code,
                message,
                data,
                api_response_id,
                description: details
            } = await request.json();


            return {
                success: code === "201",
                message: message,
                data: { ...data, api_response_id, details },
            };
        } catch (error) {
            console.error("[CinetPay Create Payment Error]:", error);
            throw error;
        }
    }

    async createMobilePayment(amount, currency, transactionId, description) {
        try {
            console.log(`[CinetPay] Création paiement par Mobile Money...`);

            const payload = {
                apikey: this.apiKey,
                site_id: currency === 'USD' ? this.siteIdUsd : this.siteIdCdf,
                alternative_currency: currency === 'USD' ? 'CDF' : 'USD',
                transaction_id: transactionId,
                amount: amount,
                currency: currency,
                description: description,
                channels: "MOBILE_MONEY",
                notify_url: this.callbackUrl,
                return_url: this.callbackUrl,
            };

            const config = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            };
            
            const request = await fetch(`${this.apiInEndpoint}`, config);
            
            if(!request.ok){
                console.error("[CinetPay Create Payment Error]: Réponse non OK de l'API", request.statusText);
                throw new Error(`Erreur API CinetPay: ${request?.status}`);
            }

            const {
                code,
                message,
                data,
                api_response_id,
                description: details
            } = await request.json();


            return {
                success: code === "201",
                message: message,
                data: { ...data, api_response_id, details },
            };
        } catch (error) {
            console.error("[CinetPay Create Payment Error]:", error);
            throw error;
        }
    }

    async deposit(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [customerData, amount, currency, transactionId, description, type] = args;
        try {
            let response;
            if (type === 'MOBILE_MONEY') {
                response = await this.createMobilePayment(amount, currency, transactionId, description);
            } else {
                response = await this.createCardPayment(customerData, amount, currency, transactionId, description);
            }
            // SI une callback est fournie, on l'exécute en lui passant le résultat
            if (callback && typeof callback === 'function') {
                callback(null, response);
            }

            return response;
        } catch (error) {
            console.error("[CinetPay Deposit Error]:", error);
            if (callback && typeof callback === 'function') {
                callback(error, null);
            }
            throw error;
        }
    }

    async checkUsd(transactionId) {
        try {
            console.log(`[CinetPay] Vérification du statut pour la commande ${transactionId}...`);
            const request = await fetch(`https://api-checkout.cinetpay.com/v2/payment/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apikey: this.apiKey,
                    site_id: this.siteIdUsd,
                    transaction_id: transactionId
                })
            });
            const response = await request.json();
            return response;
        } catch (error) {
            throw error;
        }
    }

    async checkCdf(transactionId) {
        try {
            console.log(`[CinetPay] Vérification du statut pour la commande ${transactionId}...`);
            const request = await fetch(`https://api-checkout.cinetpay.com/v2/payment/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apikey: this.apiKey,
                    site_id: this.siteIdCdf,
                    transaction_id: transactionId
                })
            });
            const response = await request.json();
            return response;
        } catch (error) {
            throw error;
        }
    }

    async check(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [transactionId, type] = args;
        try {
            let response;
            if (type === 'USD') {
                response = await this.checkUsd(transactionId);
            } else {
                response = await this.checkCdf(transactionId);
            }

            if (callback && typeof callback === 'function') {
                callback(null, response);
            }
            return response;
        } catch (error) {
            if (callback && typeof callback === 'function') {
                callback(error, null);
            }
            throw error;
        }
    }

    async withdraw(amount, currency, phone, reference, callback = null) {
        try {
            console.log(`[CinetPay] Initiation retrait vers ${phone}`);
            // Simulation de l'appel API
            const response = { success: true, message: "Transfert en cours de traitement" };
            if (callback && typeof callback === 'function') {
                callback(null, response);
            }
            return response;
        } catch (error) {
            if (callback && typeof callback === 'function') {
                callback(error, null);
            }
            throw error;
        }
    }
}

module.exports = CinetPayService;