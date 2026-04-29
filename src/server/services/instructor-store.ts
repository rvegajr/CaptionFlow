export interface Instructor {
  id: string;
  institutionId: string | null;
  ltiSub: string | null;
  email: string;
  displayName: string | null;
  role: 'instructor' | 'institution_admin';
  createdAt: Date;
}

export interface InstructorReader {
  getById(id: string): Promise<Instructor | null>;
  findByEmail(email: string): Promise<Instructor | null>;
}

export interface InstructorWriter {
  create(email: string, displayName?: string | null): Promise<Instructor>;
  setInstitutionAndLti(
    id: string,
    institutionId: string,
    ltiSub: string,
    displayName?: string | null,
  ): Promise<Instructor>;
}
