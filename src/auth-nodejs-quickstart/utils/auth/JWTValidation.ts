// utils/msalValidation.ts
import jwt, { JwtHeader, JwtPayload } from 'jsonwebtoken';
import jwksClient, { SigningKey } from 'jwks-rsa';

export interface ValidatedTokenPayload extends JwtPayload {
  oid: string;        // Entra Object ID (user's unique ID)
  email?: string;
  preferred_username?: string;
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
    if (!process.env.ENTRA_TENANT_ID) {
      throw new Error('Server configuration error: Missing ENTRA_TENANT_ID');
    }
    
    client = jwksClient({
      jwksUri: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/discovery/v2.0/keys`,
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
    if (!process.env.ENTRA_TENANT_ID || (!process.env.ENTRA_AUDIENCE && !process.env.ENTRA_CLIENT_ID)) {
      throw new Error('Server configuration error: Missing ENTRA_TENANT_ID and either ENTRA_AUDIENCE or ENTRA_CLIENT_ID');
    }

    // Verify the token
    const verified = jwt.verify(token, signingKey, {
      audience: process.env.ENTRA_AUDIENCE || process.env.ENTRA_CLIENT_ID,
      issuer: [
        `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`,
        `https://sts.windows.net/${process.env.ENTRA_TENANT_ID}/`
      ],
      algorithms: ['RS256'],
      clockTolerance: 5 // 5 seconds
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
  console.log('\n=== TOKEN DEBUG INFO ===\n');
  
  try {
    const decoded = decodeToken(token);
    
    if (!decoded) {
      console.log('❌ Failed to decode token');
      return;
    }

    console.log('Header:', decoded.header);
    console.log('\nPayload:');
    console.log('  oid (userId):', decoded.payload.oid);
    console.log('  email:', decoded.payload.email || decoded.payload.preferred_username);
    console.log('  name:', decoded.payload.name);
    console.log('  tid (tenantId):', decoded.payload.tid);
    console.log('  aud (audience):', decoded.payload.aud);
    console.log('  iss (issuer):', decoded.payload.iss);
    console.log('  exp (expiration):', new Date(decoded.payload.exp * 1000).toISOString());
    console.log('  iat (issued at):', new Date(decoded.payload.iat * 1000).toISOString());
    
    if (decoded.payload.scp) {
      console.log('  scopes:', decoded.payload.scp);
    }
    
    if (decoded.payload.roles) {
      console.log('  roles:', decoded.payload.roles);
    }

    const expiration = getTokenExpiration(token);
    const expired = isTokenExpired(token);
    
    console.log('\nToken Status:');
    console.log('  Expired:', expired ? '❌ YES' : '✓ NO');
    if (expiration) {
      const now = new Date();
      const timeLeft = expiration.getTime() - now.getTime();
      const minutesLeft = Math.floor(timeLeft / 1000 / 60);
      console.log('  Time remaining:', minutesLeft, 'minutes');
    }
    
  } catch (error) {
    console.log('❌ Error decoding token:', error);
  }
  
  console.log('\n======================\n');
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
