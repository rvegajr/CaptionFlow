export interface GrantWriter {
  grant(ownerCaptionId: string, granteeInstructorId: string): Promise<void>;
  revoke(ownerCaptionId: string, granteeInstructorId: string): Promise<void>;
}

export interface GrantReader {
  hasGrant(ownerCaptionId: string, granteeInstructorId: string): Promise<boolean>;
}
