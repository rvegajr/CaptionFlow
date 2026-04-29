export interface ViewWriter {
  logView(captionedResourceId: string, institutionId: string | null): Promise<void>;
}

export interface ViewReader {
  monthlyCountsByInstitution(institutionId: string, yearMonth: string): Promise<{ day: string; count: number }[]>;
}
