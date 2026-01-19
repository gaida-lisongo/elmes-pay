const jsonwebtoken = require('jsonwebtoken');


//Manage Tokens of User
const tokenManager = {
    generateToken: (payload) => {
        // Implementation for generating a token
        const secretKey = process.env.JWT_SECRET || 'default_secret_key';
        const token = jsonwebtoken.sign(payload, secretKey, { expiresIn: '1h' });
        return token;
    },
    validateToken: (token) => {
        // Implementation for validating a token
        const secretKey = process.env.JWT_SECRET || 'default_secret_key';
        try {
            const decoded = jsonwebtoken.verify(token, secretKey);
            return { valid: true, decoded };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
};

//Middleware to protect
const secureWithToken = {
    authenticate: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token manquant' });
        }

        const validation = tokenManager.validateToken(token);
        if (!validation.valid) {
            return res.status(403).json({ success: false, message: 'Token invalide', error: validation.error });
        }

        req.user = validation.decoded;
        next();
    },
    //Other middlewares can be added here

};

module.exports = { tokenManager, secureWithToken };