class ServicePay {
    // Collecter l'argent
    async deposit(...args) {
        throw new Error("Méthode deposit() non implémentée");
    }

    // Vérifier le statut
    async check(...args) {
        throw new Error("Méthode check() non implémentée");
    }

    // Retirer de l'argent
    async withdraw(...args) {
        throw new Error("Méthode withdraw() non implémentée");
    }
}

module.exports = ServicePay;