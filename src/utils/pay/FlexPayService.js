const ServicePay = require('./ServicePay');
//dotenv config
require('dotenv').config();

class FlexPayService extends ServicePay {
    constructor() {
        // Pattern Singleton
        if (FlexPayService.instance) {
            return FlexPayService.instance;
        }

        super();
        this.apiHost = process.env.FLEX_HOST;
        this.apiOutHost = process.env.FLEX_OUT_HOST;
        this.apiCheckOutHost = process.env.FLEX_OUT_CHECK;
        this.apiOutBalaceHost = process.env.FLEX_OUT_BALANCE;
        this.tokenOut = '';
        this.tokenExpiration = null; // Timestamp d'expiration du token
        this.isValidTokenOut = false;
        this.userName = process.env.FLEX_OUT_USERNAME;
        this.password = process.env.FLEX_OUT_PASSWORD;
        this.apiOutAuth = process.env.FLEX_OUT_AUTH;
        console.log('FlexPayService initialized with API Host:', this.apiOutAuth);
        this.cardEndpoint = process.env.FLEX_CARD;
        this.checkEndpoint = process.env.FLEX_CHECK;
        this.token = process.env.FLEX_TOKEN;
        this.merchant = process.env.FLEX_MERCHANT;
        this.callback_url = 'http://localhost:3000/api/v1/flexpay/transaction'; // A remplacer par l'URL de votre application

        // Sauvegarder l'instance
        FlexPayService.instance = this;
    }

    /**
     * Vérifie si le token de payout est encore valide
     */
    isTokenValid() {
        if (!this.tokenOut || !this.tokenExpiration) {
            return false;
        }
        const now = Date.now();
        const timeRemaining = this.tokenExpiration - now;
        
        // Considérer le token comme expiré 30 secondes avant l'expiration réelle
        return timeRemaining > 30000;
    }

    /**
     * Méthode pour s'assurer qu'on a un token valide avant les opérations de payout
     */
    async ensureValidToken() {
        if (!this.isTokenValid()) {
            console.log('[FlexPay] Token expiré ou inexistant, nouvelle authentification...');
            await this.authenticate();
        } else {
            const timeRemaining = Math.floor((this.tokenExpiration - Date.now()) / 1000);
            console.log(`[FlexPay] Token encore valide pour ${timeRemaining} secondes`);
        }
    }

    async createCardPayment(amount, currency, reference) {
        try {
            /*
            Payload Data Example:
            {
                "authorization":"Bearer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                "merchant":"ZANDO",
                "reference":"TEST0014521",
                "amount":"10",
                "currency":"USD",
                "language”:"EN",
                "description":"Tests de paiement",
                "callback_url":"https://xxxxxx/callback.com",
                "approve_url":"https://xxxxxx/approve.com",
                "cancel_url":"https://xxxxxxxx/cancel.com",
                "decline_url":"https://xxxxxxxx/decline.com",
            } 
            */

            const payload = {
                authorization: this.token,
                merchant: this.merchant,
                reference: reference,
                amount: amount,
                currency: currency,
                language: "FR",
                description: "Paiement par carte via FlexPay",
                // Les URLs de redirection peuvent être paramétrées ici
                callback_url: this.callback_url,
                approve_url: this.callback_url,
                cancel_url: this.callback_url,
                decline_url: this.callback_url, 
            }

            const requestOptions = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token.split(' ')[1]}`
                },
                body: JSON.stringify(payload)
            };

            const request = await fetch(this.cardEndpoint, requestOptions);
            if (!request.ok) {
                throw new Error(`Erreur FlexPay Card Payment: ${request.status} ${request.statusText}`);
            }
            const {
                code,
                message,
                orderNumber,
                url
            } = await request.json();
            
            console.log(`[FlexPay] Création paiement carte - Code: ${code}, Message: ${message}, OrderNumber: ${orderNumber}`);
            return {
                success: code === "0",
                message,
                data : { orderNumber, url }
            };
        } catch (error) {
            console.error(`[FlexPay] Erreur création paiement carte: ${error.message}`);
            throw error;
        }
    }

    async createMobilePayment(amount, currency, phone, reference) {
        try {
            /*
            Payload Data Example:
            
            {
                "merchant": "ZANDO",
                "type": "1",
                "phone": "243891234567",
                "reference": "MLOPN5472458",
                "amount": "100",
                "currency": "CDF",
                "callbackUrl": "https://abcd.efgh.cd"
            }
            */

            //Recupérer 9 dernier chiffres du téléphone
            if (phone.length > 9) {
                phone = phone.slice(-9);
            }
            phone = "243" + phone;

            const payload = {
                merchant: this.merchant,
                type: "1", // Type 1 pour Mobile Money
                phone: phone,
                reference: reference,
                amount: amount,
                currency: currency,
                callbackUrl: this.callback_url
            };
            const requestOptions = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token.split(' ')[1]}`
                },
                body: JSON.stringify(payload)
            };

            const request = await fetch(this.apiHost, requestOptions);
            if (!request.ok) {
                throw new Error(`Erreur FlexPay Mobile Payment: ${request.status} ${request.statusText}`);
            }

            const {
                code,
                message,
                orderNumber
            } = await request.json();

            return {
                success: code === "0",
                message,
                data : { orderNumber }
            };

        } catch (error) {
            console.error(`[FlexPay] Erreur création paiement mobile: ${error.message}`);
            throw error;
        }
    }

    async deposit(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [amount, currency, phone, reference] = args;
        try {
            console.log(`[FlexPay] Initiation du dépôt...`);
            let response;
            
            if(reference.startsWith('CARD_')) {
                response = await this.createCardPayment(amount, currency, reference);
            } else {
                response = await this.createMobilePayment(amount, currency, phone, reference);
            }
            // SI une callback est fournie, on l'exécute en lui passant le résultat
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

    async checkBalance(){
        try {
            // S'assurer qu'on a un token valide
            await this.ensureValidToken();

            console.log(`[FlexPay] Vérification du solde...`);
            const url = `${this.apiCheckOutHost}/balance/${this.merchant?.toLowerCase()}`;
            console.log(`URL`, url);
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tokenOut}`
                }
            };
            const request = await fetch(url, requestOptions);
            if (!request.ok) {
                throw new Error(`Erreur FlexPay Check Balance: ${request.status} ${request.statusText}`);
            }

            const response = await request.json();

            console.log(`[FlexPay] Solde récupéré:`, response);

            const {
                code,
                message,
                balances
            } = response;

            if(code !== "0"){
                throw new Error(`Erreur FlexPay Check Balance: ${message}`);
            }

            return balances;
        } catch (error) {
            console.error(`[FlexPay] Erreur vérification solde: ${error.message}`);
            throw error;
        }
    }

    async authenticate() {
        try {
            console.log(`[FlexPay] Authentification en cours...`, this.apiOutAuth);
            const request = fetch(this.apiOutAuth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: this.userName,
                    password: this.password
                })
            });

            const response = await request;

            if (!response.ok) {
                throw new Error(`Erreur d'authentification FlexPay: ${response.status} ${response.statusText}`);
            }

            const {
                code,
                token,
                expire_in
            } = await response.json();

            console.log('Expire in:', expire_in);

            if (code === "0" && token) {
                this.tokenOut = token.toString();
                // Calculer l'expiration (3600 secondes par défaut ou expire_in de l'API)
                const expirationSeconds = expire_in || 3600;
                this.tokenExpiration = Date.now() + (expirationSeconds * 1000);
                this.isValidTokenOut = true;
                
                console.log(`[FlexPay] Authentification réussie. Token valide pour ${expirationSeconds}s`);
                return {
                    success: true,
                    message: "Authentification réussie",
                    data: { expire_in: expirationSeconds }
                };
            } else {
                this.isValidTokenOut = false;
                return {
                    success: false,
                    message: "Échec de l'authentification",
                    data: null
                };
            }
        } catch (error) {
            console.error(`[FlexPay] Erreur d'authentification: ${error.message}`);
            this.isValidTokenOut = false;
            throw error;
        }
    }

    async createWithdrawal(amount, currency, phone, reference) {
        try {
            // S'assurer qu'on a un token valide
            const balances = await this.checkBalance();

            const balanceForCurrency = balances.find(b => b.currency === currency);

            if(!balanceForCurrency || !balanceForCurrency.amount) {
                throw new Error(`Solde insuffisant pour la devise ${currency}`);
            }

            const solde = parseFloat(balanceForCurrency.amount);
            if(solde < amount) {
                throw new Error(`Solde insuffisant: Disponible ${solde} ${currency}, Requis: ${amount} ${currency}`);
            }
            
            //Recupérer 9 dernier chiffres du téléphone
            if (phone.length > 9) {
                phone = phone.slice(-9);
            }
            phone = "243" + phone;

            const payload = {
                merchant: this.merchant,
                type: "1", // Type 1 pour Mobile Money
                reference: reference,
                amount: amount,
                currency: currency,
                customer: phone,
                description: `Retrait pour le numéro ${phone}`,
                callback_url: this.callback_url
            };

            const requestOptions = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tokenOut}`
                },
                body: JSON.stringify(payload)
            };
            const request = await fetch(this.apiOutHost, requestOptions);
            if (!request.ok) {
                throw new Error(`Erreur FlexPay Withdrawal: ${request.status} ${request.statusText}`);
            }

            const response = await request.json();
            console.log(`response`, response);
            const {
                code,
                message,
                status,
                orderNumber
            } = response;

            return {
                success: code === "0",
                message: message,
                data : {orderNumber, status }
            };

        } catch (error) {
            console.error(`[FlexPay] Erreur création retrait: ${error.message}`);
            throw error;
        }
    }

    async check(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [orderNumber] = args;

        try {
            const url = `${this.checkEndpoint}check/${orderNumber}`;
            console.log(`[FlexPay] Vérification du statut pour la commande ${orderNumber}...`);
            
            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token.split(' ')[1]}`
                }
            };

            console.log('Url :', url);

            const request = await fetch(url, requestOptions);
            if (!request.ok) {
                throw new Error(`Erreur FlexPay Check Status: ${request.status} ${request.statusText}`);
            }

            const {
                code,
                message,
                transaction
            } = await request.json();            

            const response = {
                success: code === "0",
                message,
                data: transaction
            }

            if (callback && typeof callback === 'function') {
                callback(null, response);
            }
            return response;
        } catch (error) {
            console.error(`[FlexPay] Erreur vérification statut: ${error.message}`);
            if (callback && typeof callback === 'function') {
                callback(error, null);
            }
            throw error;
        }
    }

    async withdraw(...args) {
        let callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
        const [amount, currency, phone, reference] = args;
        try {
            console.log(`[FlexPay] Initiation du retrait...`);
            const response = await this.createWithdrawal(amount, currency, phone, reference);
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

// Créer l'instance singleton
const instance = new FlexPayService();

module.exports = instance;