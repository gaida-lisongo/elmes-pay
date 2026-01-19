const ServicePay = require('./ServicePay');
require('dotenv').config();
const uuid = require('uuid');

class WonyaPayService extends ServicePay {
    constructor(){
        super();
        this.apiInEndpoint = process.env.WONYAPAY_IN_API_URL;
        this.apiOutEndpoint = process.env.WONYAPAY_OUT_API_URL;
        this.apiCheckEndpoint = process.env.WONYAPAY_CHECK;
        this.caisseId = process.env.WONYAPAY_CAISSE_ID;
        this.token = process.env.WONYAPAY_TOKEN;
        this.callbackUrl = 'http://localhost:3000/api/v1/wonyapay/transaction'; // A remplacer par l'URL de votre application
    }


    // ✅ BON - Référence unique basée sur timestamp
    generateRefTransa(){
        const timestamp = Date.now().toString().slice(-8); // 8 derniers chiffres
        const random = Math.random().toString(36).substring(2, 14); // 12 caractères aléatoires
        return `A${timestamp}${random.substring(0, 12)}`.substring(0, 20);
    };

    async createMobileMoneyPayment(phone, amount, currency, motif) {
        try {
            const refTransa = this.generateRefTransa();
            const payload = {
                RefPartenaire: this.caisseId,
                callbackUrl: this.callbackUrl, // A remplacer par l'URL de votre application
                MobileMoney: phone,
                Devise: currency,
                Montant: amount,
                Motif: motif,
                RefTransa: refTransa,
            };
            
            console.log('Payload for createMobileMoneyPayment:', payload);

            const config = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(payload)
            };
            
            const request = await fetch(`${this.apiInEndpoint}`, config);
            if(!request.ok){
                console.error("[WonyaPay Create Payment Error]: Réponse non OK de l'API", request.statusText);
                throw new Error(`Erreur API WonyaPay: ${request?.status}`);
            }

            const {
                status,
                message,
                documentId
            } = await request.json();
            return {
                success: status === 201,
                message,
                data: { documentId, refTransa },
            };
        } catch (error) {
            console.error("[WonyaPay Create Payment Error]:", error);
            throw error;
        }
    }

    async createWithdrawal(phone, amount, currency, userName, motif) {

        try {
            const body = {
                RefPartenaire: this.caisseId,
                MobileMoney: phone,
                Devise: currency,
                Montant: amount,
                NomBeneficiaire: userName,
                Motif: motif,
                RefTransa: this.generateRefTransa(),
            };

            const res = await fetch(this.apiOutEndpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errText}`);
            }

            const {statusCode, message, data} = await res.json();

            return {
                success: data?.status === "Acceptée",
                message: message,
                data: data,
            };
            
        } catch (err) {
            console.error("[WonyaPay Withdrawal Error]:", err);
            throw err;
        }
    }

    async check(...args){
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [orderNumber] = args;

        try {

            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    RefTransa: orderNumber
                })
            };
            const request = await fetch(this.apiCheckEndpoint, requestOptions);
            if(!request.ok){
                console.error("[WonyaPerson Checking Payment Error]: Réponse non OK de l'API", request.statusText);
                throw new Error(`Erreur API WonyaPay: ${request?.status}`);
            }
            

            const resp = await request.json();
            console.log(`resp`, resp);

            if(callback){
                return callback(null, resp);
            }

            // On retourne le résultat sans la clé success
            const data = { ...resp };
            delete data.success;

            return {
                success: resp.success,
                message: "Vérification de paiement réussie",
                data,
            };
            
        } catch (error) {
            console.error("[WonyaPerson Checking Payment Error]:", error);
            throw error;
            
        }
    }

    async deposit(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [phone, amount, currency, motif] = args;

        try {
            const response = await this.createMobileMoneyPayment(phone, amount, currency, motif);
            
            if (callback && typeof callback === 'function') {
                callback(null, response);
            }

            return response;
        } catch (error) {
            console.error("[WonyaPay Deposit Error]:", error);
            if (callback && typeof callback === 'function') {
                callback(error, null);
            }
            throw error;
        }
    }

    async withdraw(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [phone, amount, currency, userName, motif] = args;

        try {
            const response = await this.createWithdrawal(phone, amount, currency, userName, motif);
            if (callback && typeof callback === 'function') {
                callback(null, response);
            }
            return response;
        } catch (error) {
            console.error("[WonyaPay Withdraw Error]:", error);
            if (callback && typeof callback === 'function') {
                callback(error, null);
            }
            throw error;
        }
    }
}

module.exports = WonyaPayService;