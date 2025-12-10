import { Request, Response, NextFunction } from 'express';
import { Container } from '@azure/cosmos';
import { validateAccessToken } from './JWTValidation';
import { ProjectMemberRepository } from '../../repositories/ProjectMemberRepository';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { getCachedProjectAccess } from '../cache/CacheHelpers';
import { ProjectRole, TokenUser } from '../../models/ProjectMember';

export interface AuthRequest extends Request {
  user: TokenUser;
  userRole?: ProjectRole;
  projectId?: string;
}

let projectMemberRepo: ProjectMemberRepository;
let projectRepo: ProjectRepository;

export function initAuthMiddleware(container: Container) {
  projectMemberRepo = new ProjectMemberRepository(container);
  projectRepo = new ProjectRepository(container);
}

/**
 * Verify JWT using jsonwebtoken library
 */
export async function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'no_token',
        message: 'Authorization header must be in format: Bearer <token>' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Validate token with signature verification (includes expiration check)
    const tokenPayload = await validateAccessToken(token);

    // Extract user info from token
    const user: TokenUser = {
      userId: tokenPayload.oid,
      email: tokenPayload.upn || tokenPayload.email || tokenPayload.unique_name || '',
      name: tokenPayload.name || 'Unknown User',
      tenantId: tokenPayload.tid
    };

    // Log successful authentication (optional, remove in production if too verbose)
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Token validated:', {
        userId: user.userId,
        email: user.email,
        name: user.name,
        exp: new Date(tokenPayload.exp * 1000).toISOString()
      });
    }

    // Attach user to request
    (req as AuthRequest).user = user;
    
    next();
  } catch (error: any) {
    console.error('JWT verification error:', error.message);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({ 
        error: 'token_expired',
        message: 'Your session has expired. Please sign in again.'
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({ 
        error: 'invalid_token',
        message: 'Token validation failed. Please sign in again.'
      });
    }

    if (error.message === 'Token not yet valid') {
      return res.status(401).json({ 
        error: 'token_not_valid_yet',
        message: 'Token is not yet valid. Check system time.'
      });
    }

    // Generic authentication failure
    return res.status(401).json({ 
      error: 'authentication_failed',
      message: 'Authentication failed. Please sign in again.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message })
    });
  }
}

/**
 * Check project access with caching
 */
export async function checkProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    const { client_name, slug } = extractProjectParams(req);
    let projectId: string | undefined;

    if (!client_name || !slug) {
      return res.status(400).json({ 
        error: 'missing_parameters',
        message: 'Missing required parameters',
        required: ['client_name', 'slug'],
        received: { client_name, slug }
      });
    }

    // If projectId is missing, try to resolve it from client_name and slug
    if (!projectId) {
      const project = await projectRepo.getProjectsByClientAndSlug(client_name, slug);
      if (!project) {
        return res.status(404).json({ 
          error: 'project_not_found',
          message: 'Project not found'
        });
      }
      projectId = project.id;      
    }

    // Get project access from cache or database
    const access = await getCachedProjectAccess(
      authReq.user.userId,
      projectId,
      async () => {
        const member = await projectMemberRepo.getMember(
          authReq.user.userId,
          projectId,
          client_name,
          slug
        );

        if (!member) {
          return null;
        }

        return {
          userId: authReq.user.userId,
          projectId: projectId!,
          role: member.role,
          client_name: member.client_name,
          slug: member.slug,
          cachedAt: Date.now()
        };
      }
    );

    if (!access) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✗ Access denied:', {
          userId: authReq.user.userId,
          email: authReq.user.email,
          projectId,
          client_name,
          slug
        });
      }
      
      return res.status(403).json({ 
        error: 'access_denied',
        message: 'You do not have access to this project'
      });
    }

    authReq.projectId = projectId;
    authReq.userRole = access.role as ProjectRole;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Project access granted:', {
        userId: authReq.user.userId,
        email: authReq.user.email,
        projectId,
        role: access.role
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ 
      error: 'authorization_failed',
      message: 'Authorization check failed'
    });
  }
}

/**
 * Require minimum role level
 */
export function requireRole(minimumRole: ProjectRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const roleHierarchy: Record<ProjectRole, number> = {
      owner: 3,
      editor: 2,
      viewer: 1
    };

    const userRoleLevel = roleHierarchy[authReq.userRole || 'viewer'];
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        error: 'insufficient_permissions',
        message: `This action requires ${minimumRole} role or higher`,
        currentRole: authReq.userRole,
        requiredRole: minimumRole
      });
    }
    
    next();
  };
}

/**
 * Combined middleware to verify JWT, check project access, and enforce role
 */
export function requireProjectAccess(minimumRole: ProjectRole = 'viewer') {
  return [
    verifyJWT,
    checkProjectAccess,
    requireRole(minimumRole)
  ];
}

/**
 * Extract project parameters from request
 */
function extractProjectParams(req: Request) {
  return {
    client_name: (req.params.client_name || req.body.client_name || req.query.client_name) as string,
    slug: (req.params.slug || req.body.slug || req.query.slug) as string
  };
}