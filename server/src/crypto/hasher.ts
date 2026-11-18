import crypto from 'node:crypto';
import fs from 'node:fs';

export interface FileHashes {
  sha256: string;
  md5: string;
  sha1: string;
  size: number;
}

/**
 * Calculates SHA-256, MD5, and SHA-1 hashes from a file on disk using streaming
 * to maintain low memory overhead even with multi-gigabyte disk images.
 */
export async function calculateFileHashes(filePath: string): Promise<FileHashes> {
  return new Promise((resolve, reject) => {
    const sha256 = crypto.createHash('sha256');
    const md5 = crypto.createHash('md5');
    const sha1 = crypto.createHash('sha1');
    let size = 0;

    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => {
      size += chunk.length;
      sha256.update(chunk);
      md5.update(chunk);
      sha1.update(chunk);
    });

    stream.on('end', () => {
      resolve({
        sha256: sha256.digest('hex').toLowerCase(),
        md5: md5.digest('hex').toLowerCase(),
        sha1: sha1.digest('hex').toLowerCase(),
        size,
      });
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Calculates SHA-256, MD5, and SHA-1 from an in-memory buffer
 */
export function calculateBufferHashes(buffer: Buffer): FileHashes {
  return {
    sha256: crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase(),
    md5: crypto.createHash('md5').update(buffer).digest('hex').toLowerCase(),
    sha1: crypto.createHash('sha1').update(buffer).digest('hex').toLowerCase(),
    size: buffer.length,
  };
}

/**
 * Verifies live stored file against recorded expected SHA-256 hash
 */
export async function verifyEvidenceIntegrity(filePath: string, expectedSha256: string): Promise<{
  verified: boolean;
  calculatedSha256: string;
  expectedSha256: string;
  result: 'INTEGRITY_VERIFIED' | 'INTEGRITY_COMPROMISED';
}> {
  if (!fs.existsSync(filePath)) {
    return {
      verified: false,
      calculatedSha256: 'FILE_NOT_FOUND_ON_DISK',
      expectedSha256: expectedSha256.toLowerCase(),
      result: 'INTEGRITY_COMPROMISED',
    };
  }

  const { sha256: calculated } = await calculateFileHashes(filePath);
  const normalizedExpected = expectedSha256.toLowerCase().trim();
  const verified = calculated === normalizedExpected;

  return {
    verified,
    calculatedSha256: calculated,
    expectedSha256: normalizedExpected,
    result: verified ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_COMPROMISED',
  };
}
