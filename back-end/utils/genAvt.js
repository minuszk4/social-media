const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../cloud/cloudinary');  // Import Cloudinary directly

const createAvatar = async (fullName, userId) => {
    const initials = fullName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('') 
        .substring(0, 3);  // Limit to first 3 characters

    try {
        const canvas = createCanvas(256, 256);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#007BFF';
        ctx.fillRect(0, 0, 256, 256);

        ctx.font = 'bold 128px sans-serif';
        ctx.fillStyle = '#ffffff';  

        const textWidth = ctx.measureText(initials).width;
        const textHeight = 128;  // font size
        const x = (256 - textWidth) / 2;
        const y = (256 + textHeight) / 2;

        ctx.fillText(initials, x, y);

        const avatarDir = path.join(__dirname, '../public/avatars');
        if (!fs.existsSync(avatarDir)) {
            fs.mkdirSync(avatarDir, { recursive: true });
        }

        const filename = `avatar_${userId}.png`;
        const filepath = path.join(avatarDir, filename);

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);

        const cloudinaryResponse = await cloudinary.uploader.upload(filepath, {
            resource_type: 'image', 
            public_id: `avatars/avatar_${userId}`, 
            overwrite: true,  
            folder: 'avatars'  
        });

        fs.unlinkSync(filepath);

        return cloudinaryResponse.secure_url;

    } catch (error) {
        console.error('Error generating avatar:', error);
        throw new Error('Failed to create avatar');
    }
};

module.exports = { createAvatar };
