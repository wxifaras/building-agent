import { Router, Request, Response, RequestHandler } from 'express';
import { Container } from '@azure/cosmos';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { ProjectMemberRepository } from '../repositories/ProjectMemberRepository';
import { verifyJWT, requireProjectAccess, AuthRequest } from '../utils/auth/AuthMiddleware';
import { getCachedUserProjects } from '../utils/cache/CacheHelpers';
import { randomUUID } from 'crypto';
import { createLogger } from '../utils/telemetry/logger';

const logger = createLogger();

export function initProjectRoutes(container: Container) {
  const router = Router();
  const projectRepo = new ProjectRepository(container);
  const memberRepo = new ProjectMemberRepository(container);

  /**
   * @swagger
   * /api/projects:
   *   get:
   *     summary: Get all projects for authenticated user
   *     tags: [Projects]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's projects
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Project'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get('/', verifyJWT, async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    
    try {
      logger.info('Fetching user projects', { userId: authReq.user.userId });
      
      const projects = await getCachedUserProjects(
        authReq.user.userId,
        async () => {
          return await memberRepo.getUserProjects(authReq.user.userId);
        }
      );

      logger.info('Projects fetched', { 
        userId: authReq.user.userId,
        count: projects.length 
      });

      res.json(projects);
    } catch (error: any) {
      logger.error('Error fetching user projects', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Project'
   *     responses:
   *       201:
   *         description: Project created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       400:
   *         description: Bad request - missing required fields
   *       401:
   *         description: Unauthorized
   *       409:
   *         description: Project already exists
   */
  router.post('/', verifyJWT, async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const projectData = req.body;
    
    try {
      const userId = authReq.user.userId;
      const userEmail = authReq.user.email || 'unknown';

      logger.info('Creating project', { 
        userId,
        client_name: projectData.client_name,
        slug: projectData.slug 
      });

      // Basic validation
      if (!projectData.client_name || !projectData.slug || !projectData.name || !projectData.projectNumber) {
        logger.warn('Project creation validation failed', { reason: 'missing-required-fields' });
        return res.status(400).json({ error: 'Missing required fields: client_name, slug, name, projectNumber' });
      }

      // Check if project exists
      const existingProject = await projectRepo.getProjectsByClientAndSlug(projectData.client_name, projectData.slug);
      if (existingProject) {
        logger.warn('Project already exists', { 
          client_name: projectData.client_name,
          slug: projectData.slug 
        });
        return res.status(409).json({ error: 'Project with this client_name and slug already exists' });
      }

      const projectId = randomUUID();

      // Create Project
      const newProject: any = {
        id: projectId,
        docType: 'project',
        ...projectData,
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const createdProject = await projectRepo.create(newProject);
      
      const memberId = randomUUID();

      // Add Creator as Owner
      await memberRepo.create({
        id: memberId,
        docType: 'projectMember',
        client_name: createdProject.client_name,
        slug: createdProject.slug,
        projectId: createdProject.id,
        userId: userId,
        email: userEmail,
        role: 'owner',
        userName: authReq.user.name || 'Unknown'
      });

      logger.info('Project created successfully', {
        userId,
        projectId,
        client_name: projectData.client_name,
        slug: projectData.slug
      });

      res.status(201).json(createdProject);

    } catch (error: any) {
      logger.error('Error creating project', error, {
        client_name: projectData.client_name,
        slug: projectData.slug
      });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/projects/{client_name}/{slug}:
   *   get:
   *     summary: Get a specific project
   *     tags: [Projects]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: client_name
   *         required: true
   *         schema:
   *           type: string
   *         description: Client name
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: Project slug
   *     responses:
   *       200:
   *         description: Project details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Project'
   *       404:
   *         description: Project not found
   *       401:
   *         description: Unauthorized
   */
  router.get('/:client_name/:slug', 
    ...requireProjectAccess() as any,
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      const { client_name, slug } = req.params;
      const logger = (req as any).logger;
      
      try {
        logger.info('Fetching project details', { 
          client_name,
          slug,
          projectId: authReq.projectId 
        });
        
        const project = await projectRepo.getById(authReq.projectId!, client_name, slug);
        if (!project) {
          logger.warn('Project not found', { client_name, slug });
          return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json(project);
      } catch (error: any) {
        logger.error('Error fetching project details', error, {
          client_name,
          slug
        });
        res.status(500).json({ error: error.message });
      }
  });

  /**
   * @swagger
   * /api/projects/{client_name}/{slug}:
   *   put:
   *     summary: Update a project
   *     tags: [Projects]
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
   *             properties:
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *     responses:
   *       200:
   *         description: Project updated
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Project not found
   */
  router.put('/:client_name/:slug', 
    ...requireProjectAccess('editor') as any,
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      const { client_name, slug } = req.params;
      
      try {
        const updates = req.body;
        const projectId = authReq.projectId!;

        logger.info('Updating project', { 
          client_name,
          slug,
          projectId,
          fields: Object.keys(updates)
        });

        // Prevent updating immutable fields
        delete updates.id;
        delete updates.client_name;
        delete updates.slug;
        delete updates.docType;
        delete updates.createdAt;
        delete updates.ownerId;

        updates.updatedAt = new Date().toISOString();

        const updatedProject = await projectRepo.update(projectId, client_name, slug, updates);
        
        logger.info('Project updated successfully', {
          projectId,
          client_name,
          slug,
          fields: Object.keys(updates)
        });
        
        res.json(updatedProject);

      } catch (error: any) {
        logger.error('Error updating project', error, {
          client_name,
          slug
        });
        res.status(500).json({ error: error.message });
      }
  });

  /**
   * @swagger
   * /api/projects/{client_name}/{slug}:
   *   delete:
   *     summary: Delete a project
   *     tags: [Projects]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: client_name
   *         required: true
   *         schema:
   *           type: string
   *         description: Client name
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: Project slug
   *     responses:
   *       204:
   *         description: Project deleted successfully
   *       403:
   *         description: Insufficient permissions (owner role required)
   *       404:
   *         description: Project not found
   */
  router.delete('/:client_name/:slug', 
    ...requireProjectAccess('owner') as any,
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      const { client_name, slug } = req.params;
      
      try {
        const projectId = authReq.projectId!;

        logger.info('Deleting project', { 
          client_name,
          slug,
          projectId 
        });

        // Delete project
        await container.item(projectId, [client_name, slug]).delete();
        
        logger.info('Project deleted successfully', {
          projectId,
          client_name,
          slug
        });
        
        res.status(204).send();

      } catch (error: any) {
        logger.error('Error deleting project', error, {
          client_name,
          slug
        });
        res.status(500).json({ error: error.message });
      }
  });

  return router;
}
