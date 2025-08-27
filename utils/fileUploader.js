import fs from 'fs';
export const fileUploader = () => { 
  const deleteImage = (filePath) => {
    return new Promise((resolve, reject) => {
      fs.unlink(`./user_generated/${filePath}`, (err) => {
        if (err) {
          return reject(err);
        }
        resolve({ status: 200, message: 'Image deleted successfully' });
      });
    });
  }
  const uploadImage = (base64Image) => { 
    return new Promise((resolve, reject) => {
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        return reject(new Error('Invalid base64 string'));
      }
      
      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      
      const fileName = `image_${Date.now()}.${type.split('/')[1]}`;
      const filePath = `${fileName}`;
      
      fs.writeFile(`./user_generated/${filePath}`, buffer, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(filePath);
      });
    });
  }

  return {
    uploadImage,
    deleteImage
  }
}