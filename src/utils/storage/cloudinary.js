const fs = require('fs');
const path = require('path');

class CloudinaryService {
    constructor() {
        if (CloudinaryService.instance) {
            return CloudinaryService.instance;
        }
        this.cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        this.apiKey = process.env.CLOUDINARY_API_KEY;
        this.apiSecret = process.env.CLOUDINARY_API_SECRET;
        this.uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'elmespay_preset';
        
        CloudinaryService.instance = this;
    }

    /**
     * 1. PARSER : Prépare le FormData pour le fetch (upload signé)
     */
    prepareFormData(filePath, folder = 'elmespay') {
        const formData = new FormData();
        // On crée un Blob à partir du fichier local pour le fetch
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        
        // Pour l'upload signé, on utilise les clés API
        const timestamp = Math.round((new Date).getTime()/1000);
        
        formData.append('file', blob, path.basename(filePath));
        formData.append('folder', folder);
        formData.append('timestamp', timestamp);
        formData.append('api_key', this.apiKey);
        
        // Créer la signature pour l'upload signé
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`;
        const crypto = require('crypto');
        const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');
        formData.append('signature', signature);
        
        return formData;
    }

    /**
     * 2. UPLOADER : Utilise fetch vers l'API Cloudinary (upload signé)
     */
    async upload(filePath, folder = 'elmespay/profiles') {
        const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
        const formData = this.prepareFormData(filePath, folder);

        // Upload signé - pas besoin d'Authorization header
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Upload failed');
        
        return data; // Contient secure_url et public_id
    }

    /**
     * 3. SUPPRIMER : Utilise l'API Admin de Cloudinary via fetch
     */
    async deleteByUrl(fileUrl) {
        if (!fileUrl) return;

        // Extraction du public_id depuis l'URL
        // URL type: .../upload/v12345/folder/id.jpg
        const parts = fileUrl.split('/');
        const fileName = parts.pop(); // id.jpg
        const folder = parts.pop();   // folder
        const publicId = `${folder}/${fileName.split('.')[0]}`;

        const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/image/upload?public_ids[]=${publicId}`;
        const auth = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        return await response.json();
    }
}

const instance = new CloudinaryService();
Object.freeze(instance);
module.exports = instance;