export interface Institution {
  id: string;
  name: string;
  ltiIss: string;
  ltiClientId: string;
  ltiDeploymentId: string;
  licenseMaxViewsPerTerm: number | null;
  createdAt: Date;
}

export interface InstitutionReader {
  findByLti(iss: string, clientId: string, deploymentId: string): Promise<Institution | null>;
}

export interface InstitutionWriter {
  upsertByLti(
    input: Pick<
      Institution,
      'name' | 'ltiIss' | 'ltiClientId' | 'ltiDeploymentId' | 'licenseMaxViewsPerTerm'
    >,
  ): Promise<Institution>;
}
