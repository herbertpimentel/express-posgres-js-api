import AWS from 'aws-sdk';
import imageThumbnail from 'image-thumbnail';

import mime from 'mime';

import { BusinessRuleException } from '../lib/exceptions/BusinessRuleException';
import { InvalidArgumentException } from '../lib/exceptions/InvalidArgumentException';

const s3Client = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ACCESS_KEY_PASSWORD,
  region: process.env.AWS_BUCKET_REGION,
});

const uploadParams = {
  Bucket: process.env.AWS_BUCKET_NAME,
  Key: '', // pass key
  Body: null, // pass file body
};

const s3 = {
  s3Client,
  uploadParams,
};

const imageExtensions = ['png', 'jpg', 'jpeg'];

class FileService {
  async uploadToS3(userId, fileBuffer, fileName) {
    const s3Client = s3.s3Client;
    const params = s3.uploadParams;

    params.Key = fileName;
    params.Body = fileBuffer;

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
    // The response can be cached by browsers and intermediary caches for up to 5days
    // (60 seconds x 60 minutes x 24 hours * 5 days).
    params.CacheControl = 'max-age=432000';

    params.Metadata = {
      'user-id': userId,
    };

    return (
      (await new Promise()) <
      { url: string } >
      ((resolve, reject) => {
        s3Client.upload(params, (err, data) => {
          if (err) {
            reject(err);
          }

          resolve({
            url: `${process.env.AWS_BUCKET_BASE_URL}${fileName}`,
          });
        });
      })
    );
  }

  async generateThumbnail(fileBuffer, width, height) {
    return imageThumbnail(fileBuffer, {
      width,
      height,
      responseType: 'buffer',
    });
  }

  // ===========
  // handle strategies
  // ===========
  async updateUserProfileImage(userId, file) {
    if (!userId) {
      throw new BusinessRuleException('Não foi possível identificar o usuário');
    }

    // validate type image to be placed on profile image
    if (imageExtensions.includes(mime.getExtension(file.mimeType))) {
      throw new InvalidArgumentException(
        'Você deve enviar uma imagem em um dos seguintes formatos: ' +
          imageExtensions.join(', ')
      );
    }

    // uses the userId to be able to replace the file on updates
    const fileName = `${userId}-user-avatar`;

    const fileBuffer = await this.generateThumbnail(file.buffer, 460, 460);

    return this.uploadToS3(user, fileBuffer, fileName);
  }
}

export const fileService = new FileService();
