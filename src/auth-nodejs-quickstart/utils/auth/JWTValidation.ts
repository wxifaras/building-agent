// utils/msalValidation.ts
import jwt, { JwtHeader, JwtPayload } from 'jsonwebtoken';
import jwksClient, { SigningKey } from 'jwks-rsa';
import { logger } from '../telemetry/logger';

export interface ValidatedTokenPayload extends JwtPayload {
  oid: string;        // Entra Object ID (user's unique ID)
  email?: string;
  unique_name?: string; // Unique name claim (fallback for email)
  upn?: string;       // User Principal Name
  name?: string;
  tid: string;        // Tenant ID
  aud: string;        // Audience
  iss: string;        // Issuer
  exp: number;        // Expiration
  iat: number;        // Issued at
  roles?: string[];   // App roles (if using Entra app roles)
  scp?: string;       // Scopes
}

// JWKS client for getting Microsoft's public keys
// Initialize lazily to ensure environment variables are loaded
let client: any = null;

function getJwksClient() {
  if (!client) {
    if (!process.env.AZURE_TENANT_ID) {
      throw new Error('Server configuration error: Missing AZURE_TENANT_ID');
    }
    
    client = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
  }
  return client;
}

/**
 * Get signing key from Microsoft
 */
function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    getJwksClient().getSigningKey(kid, (err: Error | null, key: SigningKey | undefined) => {
      if (err) {
        reject(err);
      } else {
        resolve(key!.getPublicKey());
      }
    });
  });
}

/**
 * Validate access token using jsonwebtoken
 */
export async function validateAccessToken(token: string): Promise<ValidatedTokenPayload> {
  try {
    // Decode to get header (contains kid)
    const decodedToken = jwt.decode(token, { complete: true }) as { header: JwtHeader, payload: JwtPayload } | null;
    
    if (!decodedToken || typeof decodedToken === 'string') {
      throw new Error('Invalid token format');
    }

    if (!decodedToken.header.kid) {
      throw new Error('Token missing kid in header');
    }

    // Get Microsoft's public key
    const signingKey = await getSigningKey(decodedToken.header.kid);

    // Ensure configuration is present
    if (!process.env.AZURE_TENANT_ID || (!process.env.JWT_API_AUDIENCE && !process.env.AZURE_CLIENT_ID)) {
      throw new Error('Server configuration error: Missing AZURE_TENANT_ID and either JWT_API_AUDIENCE or AZURE_CLIENT_ID');
    }

    // Verify the token
    const verified = jwt.verify(token, signingKey, {
      audience: process.env.JWT_API_AUDIENCE || process.env.AZURE_CLIENT_ID,
      issuer: [
        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
        `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`
      ],
      algorithms: ['RS256'],
      clockTolerance: 5 // Allow 5 seconds tolerance for clock skew
    }) as unknown as ValidatedTokenPayload;

    // Validate required claims
    if (!verified.oid) {
      throw new Error('Token missing required claim: oid');
    }

    if (!verified.tid) {
      throw new Error('Token missing required claim: tid');
    }

    return verified;

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token not yet valid');
    }
    throw error;
  }
}

/**
 * Extract email from token payload
 * Tries upn, then email, then unique_name as fallback
 */
export function getEmailFromToken(payload: ValidatedTokenPayload): string | undefined {
  return payload.upn || payload.email || payload.unique_name;
}

/**
 * Extract UPN (User Principal Name) from token payload
 */
export function getUpnFromToken(payload: ValidatedTokenPayload): string | undefined {
  return payload.upn;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return expiration < new Date();
}

/**
 * Check if token is expired or about to expire
 * @param token - JWT token to check
 * @param bufferSeconds - Time in seconds before expiration to consider token invalid (default: 60)
 * @returns true if token is expired or will expire within the buffer period
 */
export function isTokenExpiredOrExpiring(token: string, bufferSeconds: number = 60): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  const now = new Date();
  const bufferTime = new Date(now.getTime() + (bufferSeconds * 1000));
  
  return expiration < bufferTime;
}

/**
 * Decode token without verification (for debugging only)
 */
export function decodeToken(token: string): any {
  return jwt.decode(token, { complete: true });
}

/**
 * Debug utility to inspect token contents
 * Use this for troubleshooting authentication issues
 */
export function debugToken(token: string): void {
  logger.info('=== TOKEN DEBUG INFO ===');
  
  try {
    const decoded = decodeToken(token);
    
    if (!decoded) {
      logger.error('Failed to decode token', new Error('Token decode failed'));
      return;
    }

    logger.info('Header', { header: decoded.header });
    logger.info('Payload', {
      oid: decoded.payload.oid,
      upn: decoded.payload.upn,
      email: decoded.payload.email || decoded.payload.unique_name,
      name: decoded.payload.name,
      tid: decoded.payload.tid,
      aud: decoded.payload.aud,
      iss: decoded.payload.iss,
      exp: new Date(decoded.payload.exp * 1000).toISOString(),
      iat: new Date(decoded.payload.iat * 1000).toISOString(),
      ...(decoded.payload.scp && { scopes: decoded.payload.scp }),
      ...(decoded.payload.roles && { roles: decoded.payload.roles })
    });

    const expiration = getTokenExpiration(token);
    const expired = isTokenExpired(token);
    
    const tokenStatus: any = {
      expired: expired ? 'YES' : 'NO'
    };
    
    if (expiration) {
      const now = new Date();
      const timeLeft = expiration.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeLeft / 1000 / 60);
      tokenStatus.timeRemaining = `${minutesLeft} minutes`;
    }
    
    logger.info('Token Status', tokenStatus);
    
  } catch (error) {
    logger.error('Error decoding token', error as Error);
  }
}

/**
 * Express middleware to debug incoming tokens
 */
export function debugTokenMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    debugToken(token);
  }
  next();
}
