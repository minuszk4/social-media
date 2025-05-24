const fs = require('fs');
const path = require('path');
const { cloudinary } = require('./cloudinary'); // adjust path as needed

const uploadDir = path.join(__dirname, '../uploads');

fs.readdir(uploadDir, async (err, files) => {
    if (err) {
        return console.error('Failed to read directory:', err);
    }

    for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const ext = path.extname(file).toLowerCase();

        let resourceType = 'image';
        if (ext === '.mp4') resourceType = 'video';

        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'uploads',
                resource_type: resourceType
            });

            console.log('Uploaded:', {
                original: file,
                cloudUrl: result.secure_url
            });

        } catch (uploadErr) {
            console.error(`Error uploading ${file}:`, uploadErr.message);
        }
    }
});
