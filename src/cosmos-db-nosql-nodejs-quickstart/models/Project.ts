// models/Project.ts

export interface ProjectDetails {
  projectNumber: string;
  name: string;
  client: string;
  author: string;
  constructionDate: string;
  country: string;
  buildingType: string;
  authorEmail: string;
}

export interface ProjectExtra {
  floorPartition: string;
  location: string;
  uploads: string;
}

export interface Project {
  id: string;
  docType: "project";
  client_name: string;
  slug: string;
  name: string;
  address: string;
  icon: string;
  lat: number;
  lon: number;
  client: string;
  projectNumber: string;
  author: string;
  buildingType: string;
  constructionDate: string;
  country: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  details: ProjectDetails;
  extra: ProjectExtra;
}