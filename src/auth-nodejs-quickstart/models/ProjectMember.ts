export interface ProjectMember {
  id: string;
  docType: "projectMember";
  client_name: string;     
  slug: string;                
  projectId: string;
  userId: string;          // Entra Object ID (oid from JWT)    
  email: string;
  userName: string;    
  role: ProjectRole;
}

export type ProjectRole = 
  | 'owner' 
  | 'editor' 
  | 'viewer';

// For caching project access
export interface CachedProjectAccess {
  userId: string;
  projectId: string;
  role: ProjectRole;
  client_name: string;
  slug: string;
  cachedAt: number;
}

// User info extracted from JWT
export interface TokenUser {
  userId: string;          // From oid claim
  email: string;           // From email claim
  name: string;            // From name claim
  tenantId: string;        // From tid claim
}