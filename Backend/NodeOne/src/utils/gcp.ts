import path from 'path';
import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';

type UploadOptions = {
  makePublic?: boolean;
  contentType?: string;
  cacheControl?: string;
  bucketName?: string;
};

let storageClient: Storage | null = null;

const getStorageClient = (): Storage => {
  if (storageClient) return storageClient;

  // Use GOOGLE_APPLICATION_CREDENTIALS for the path to service account JSON. Do not commit credentials.
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  storageClient = new Storage({
    ...(keyFilePath ? { keyFilename: keyFilePath } : {}),
    projectId: process.env.GCP_PROJECT_ID,
  });
  return storageClient;
};

export const getBucket = (overrideBucketName?: string) => {
  const bucketName = overrideBucketName || process.env.GCP_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCP_BUCKET_NAME env var is required');
  }
  return getStorageClient().bucket(bucketName);
};

export const getPublicUrl = (filePathInBucket: string, overrideBucketName?: string): string => {
  const bucketName = overrideBucketName || process.env.GCP_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCP_BUCKET_NAME env var is required');
  }
  return `https://storage.googleapis.com/${bucketName}/${filePathInBucket}`;
};

export const uploadBufferToBucket = async (
  buffer: Buffer,
  destinationPath: string,
  options: UploadOptions = {}
): Promise<{ publicUrl: string; gsUri: string }> => {
  const bucket = getBucket(options.bucketName);
  const file = bucket.file(destinationPath);

  await file.save(buffer, {
    // Use resumable + disable client-side validation to avoid stream issues
    resumable: true,
    validation: false,
    gzip: false,
    contentType: options.contentType || 'application/octet-stream',
    metadata: {
      contentType: options.contentType || 'application/octet-stream',
      cacheControl: options.cacheControl || 'public, max-age=31536000',
    },
  });

  // Note: Do not use object ACLs when Uniform Bucket-Level Access is enabled.

  return {
    publicUrl: getPublicUrl(destinationPath, bucket.name),
    gsUri: `gs://${bucket.name}/${destinationPath}`,
  };
};

export const generateV4ReadSignedUrl = async (
  filePathInBucket: string,
  expiresInSeconds = 60 * 60,
  overrideBucketName?: string
): Promise<string> => {
  const bucket = getBucket(overrideBucketName);
  const file = bucket.file(filePathInBucket);
  const config: GetSignedUrlConfig = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  };
  const [url] = await file.getSignedUrl(config);
  return url;
};

export const readFileFromBucket = async (filePathInBucket: string, overrideBucketName?: string): Promise<Buffer> => {
  const bucket = getBucket(overrideBucketName);
  const file = bucket.file(filePathInBucket);
  const [contents] = await file.download();
  return contents;
};

