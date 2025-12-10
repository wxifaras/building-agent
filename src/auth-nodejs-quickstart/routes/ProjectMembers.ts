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

/**
 * @swagger
 * /api/projects/{client_name}/{slug}/members:
 *   get:
 *     summary: Get all members of a project
 *     tags: [Project Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: client_name
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of project members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectMember'
 *       403:
 *         description: Insufficient permissions (owner role required)
 */
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

/**
 * @swagger
 * /api/projects/{client_name}/{slug}/members:
 *   post:
 *     summary: Add a member to a project
 *     tags: [Project Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: client_name
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               userName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [viewer, editor, owner]
 *     responses:
 *       201:
 *         description: Member added successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Member already exists
 */
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

/**
 * @swagger
 * /api/projects/{client_name}/{slug}/members/{userId}:
 *   patch:
 *     summary: Update a member's role
 *     tags: [Project Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: client_name
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Entra ID object ID (oid) of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, editor, owner]
 *                 description: The new role to assign to the member
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectMember'
 *       400:
 *         description: Invalid role
 *       403:
 *         description: Insufficient permissions (owner role required)
 *       404:
 *         description: Member not found
 */
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

/**
 * @swagger
 * /api/projects/{client_name}/{slug}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project
 *     tags: [Project Members]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: client_name
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Entra ID object ID (oid) of the user to remove
 *     responses:
 *       204:
 *         description: Member removed successfully
 *       400:
 *         description: Cannot remove the last owner from the project
 *       403:
 *         description: Insufficient permissions (owner role required)
 *       404:
 *         description: Member not found
 */
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