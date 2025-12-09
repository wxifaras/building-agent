import express, { Request, Response, NextFunction } from 'express';
import { Container } from '@azure/cosmos';
import { requireProjectAccess, AuthRequest } from '../utils/auth/AuthMiddleware';
import { ProjectMemberRepository } from '../repositories/ProjectMemberRepository';
import { invalidateProjectAccessCache, invalidateUserProjectsCache } from '../utils/cache/CacheHelpers';

const router = express.Router();

let projectMemberRepo: ProjectMemberRepository;

export function initProjectMemberRoutes(container: Container) {
  projectMemberRepo = new ProjectMemberRepository(container);
  return router;
}

// GET /api/projects/:client_name/:slug/members
router.get('/projects/:client_name/:slug/members',
  ...requireProjectAccess('owner') as any,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const { client_name, slug } = req.params;
      
      const members = await projectMemberRepo.getProjectMembers(
        client_name,
        slug
      );

      res.json(members);
    } catch (error) {
      console.error('Error fetching project members:', error);
      res.status(500).json({ error: 'Failed to fetch project members' });
    }
  }
);

// POST /api/projects/:client_name/:slug/members
router.post('/projects/:client_name/:slug/members',
  ...requireProjectAccess('owner') as any,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const { client_name, slug } = req.params;
      
      // Project ID is resolved by middleware
      const projectId = authReq.projectId!;
      const { userId, email, userName, role } = req.body;

      if (!userId || !email || !role) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['userId', 'email', 'role']
        });
      }

      if (!['owner', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Add member
      const member = await projectMemberRepo.addMember(
        projectId,
        userId,
        email,
        userName || email.split('@')[0],
        role,
        client_name,
        slug
      );

      // Invalidate cache
      await invalidateProjectAccessCache(userId, projectId);
      await invalidateUserProjectsCache(userId);

      res.status(201).json(member);
    } catch (error: any) {
      console.error('Error adding project member:', error);
      res.status(500).json({ error: error.message || 'Failed to add project member' });
    }
  }
);

// PATCH /api/projects/:client_name/:slug/members/:userId
router.patch('/projects/:client_name/:slug/members/:userId',
  ...requireProjectAccess('owner') as any,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const projectId = authReq.projectId!;
      const { client_name, slug, userId } = req.params;      
      const { role } = req.body;

      if (!role || !['owner', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const updatedMember = await projectMemberRepo.updateMemberRole(
        userId,
        projectId,
        client_name,
        slug,
        role
      );

      // Invalidate cache
      await invalidateProjectAccessCache(userId, projectId);
      await invalidateUserProjectsCache(userId);

      res.json(updatedMember);
    } catch (error: any) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: error.message || 'Failed to update member role' });
    }
  }
);

// DELETE /api/projects/:client_name/:slug/members/:userId
router.delete('/projects/:client_name/:slug/members/:userId',
  ...requireProjectAccess('owner') as any,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const { client_name, slug, userId } = req.params;
      const projectId = authReq.projectId!;

      // Check if this would remove the last owner
      const members = await projectMemberRepo.getProjectMembers(client_name, slug);
      const owners = members.filter(m => m.role === 'owner');
      
      if (owners.length === 1 && owners[0].userId === userId) {
        return res.status(400).json({ 
          error: 'Cannot remove the last owner from the project' 
        });
      }

      await projectMemberRepo.removeMember(userId, projectId, client_name, slug);

      // Invalidate cache
      await invalidateProjectAccessCache(userId, projectId);
      await invalidateUserProjectsCache(userId);

      res.status(204).send();
    } catch (error: any) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: error.message || 'Failed to remove member' });
    }
  }
);

export default router;