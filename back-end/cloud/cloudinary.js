const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: '',
    api_key: '',
    api_secret: ''
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads',
        allowed_formats: ['jpg', 'jpeg', 'png', 'mp4'],
        resource_type: 'auto'  
    }
});

module.exports = {
    cloudinary,
    storage
};
