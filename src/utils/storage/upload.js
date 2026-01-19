const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: 'public/', // Dossier temporaire sur le VPS
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

module.exports = multer({ storage });