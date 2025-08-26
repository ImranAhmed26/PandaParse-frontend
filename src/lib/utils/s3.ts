// S3 utility functions

/**
 * Constructs a full S3 document URL from a key
 * @param key - The S3 object key
 * @returns Full S3 URL
 */
export const getS3DocumentUrl = (key: string): string => {
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "missing-s3-url";
  return `https://${bucketName}.s3.amazonaws.com/${key}`;
};

/**
 * Extracts the S3 key from a full S3 URL
 * @param url - Full S3 URL
 * @returns S3 object key or null if invalid URL
 */
export const extractS3Key = (url: string): string | null => {
  try {
    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "missing-s3-url";
    const expectedPrefix = `https://${bucketName}.s3.amazonaws.com/`;

    if (url.startsWith(expectedPrefix)) {
      return url.substring(expectedPrefix.length);
    }

    return null;
  } catch (error) {
    console.error("Error extracting S3 key from URL:", error);
    return null;
  }
};

/**
 * Validates if a URL is a valid S3 URL for our bucket
 * @param url - URL to validate
 * @returns true if valid S3 URL for our bucket
 */
export const isValidS3Url = (url: string): boolean => {
  const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "missing-s3-url";
  const expectedPrefix = `https://${bucketName}.s3.amazonaws.com/`;
  return url.startsWith(expectedPrefix);
};

/**
 * Gets the S3 bucket name from environment variables
 * @returns S3 bucket name
 */
export const getS3BucketName = (): string => {
  return process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "missing-s3-url";
};
