import { Router, Request, Response, RequestHandler } from 'express';
import { Container } from '@azure/cosmos';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { ProjectMemberRepository } from '../repositories/ProjectMemberRepository';
import { verifyJWT, requireProjectAccess, AuthRequest } from '../utils/auth/AuthMiddleware';
import { getCachedUserProjects } from '../utils/cache/CacheHelpers';
import { randomUUID } from 'crypto';

export function initProjectRoutes(container: Container) {
  const router = Router();
  const projectRepo = new ProjectRepository(container);
  const memberRepo = new ProjectMemberRepository(container);

  // Get all projects for the authenticated user
  router.get('/', verifyJWT, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      
      const projects = await getCachedUserProjects(
        authReq.user.userId,
        async () => {
          return await memberRepo.getUserProjects(authReq.user.userId);
        }
      );

      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new project
  router.post('/', verifyJWT, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const projectData = req.body;
      const userId = authReq.user.userId;
      const userEmail = authReq.user.email || 'unknown';

      // Basic validation
      if (!projectData.client_name || !projectData.slug || !projectData.name || !projectData.projectNumber) {
        return res.status(400).json({ error: 'Missing required fields: client_name, slug, name, projectNumber' });
      }

      // Check if project exists
      const existingProject = await projectRepo.getProjectsByClientAndSlug(projectData.client_name, projectData.slug);
      if (existingProject) {
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

      res.status(201).json(createdProject);

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific project
  router.get('/:client_name/:slug', 
    ...requireProjectAccess() as any,
    async (req: Request, res: Response) => {
      const authReq = req as AuthRequest;
      const { client_name, slug } = req.params;
      
      try {
        const project = await projectRepo.getById(authReq.projectId!, client_name, slug);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
  });

  // Update project
  router.put('/:client_name/:slug', 
    ...requireProjectAccess('editor') as any,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const { client_name, slug } = req.params;
        const updates = req.body;
        const projectId = authReq.projectId!;

        // Prevent updating immutable fields
        delete updates.id;
        delete updates.client_name;
        delete updates.slug;
        delete updates.docType;
        delete updates.createdAt;
        delete updates.ownerId;

        updates.updatedAt = new Date().toISOString();

        const updatedProject = await projectRepo.update(projectId, client_name, slug, updates);
        res.json(updatedProject);

      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
  });

  // Delete project
  router.delete('/:client_name/:slug', 
    ...requireProjectAccess('owner') as any,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const { client_name, slug } = req.params;
        const projectId = authReq.projectId!;

        // Delete (Not implemented in Repository yet, but assuming standard Cosmos delete)
        await container.item(projectId, [client_name, slug]).delete();
        
        res.status(204).send();

      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
  });

  return router;
}
