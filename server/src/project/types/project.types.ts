export interface DokployProject {
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  organizationId: string;
  env: string;
}

export interface DokployEnvironment {
  environmentId: string;
  name: string;
  description: string | null;
  createdAt: string;
  env: string;
  projectId: string;
  isDefault: boolean;
}

export interface DokployProjectCreateResponse {
  project: DokployProject;
  environment: DokployEnvironment;
}
