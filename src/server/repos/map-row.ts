import type { Caption } from '../services/caption-store.js';
import type { Instructor } from '../services/instructor-store.js';
import type { CaptionedResource } from '../services/resource-store.js';
import type { Institution } from '../services/institution-store.js';

export function mapCaption(r: {
  id: string;
  instructorId: string;
  youtubeVideoId: string;
  format: 'srt' | 'vtt';
  languageCode: string;
  contentText: string;
  isMachineTranslated: boolean | null;
  sourceCaptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Caption {
  return {
    id: r.id,
    instructorId: r.instructorId,
    youtubeVideoId: r.youtubeVideoId,
    format: r.format,
    languageCode: r.languageCode,
    contentText: r.contentText,
    isMachineTranslated: r.isMachineTranslated ?? false,
    sourceCaptionId: r.sourceCaptionId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function mapInstructor(r: {
  id: string;
  institutionId: string | null;
  ltiSub: string | null;
  email: string;
  displayName: string | null;
  role: string | null;
  plan: string | null;
  createdAt: Date;
}): Instructor {
  const plan: Instructor['plan'] =
    r.plan === 'pro' || r.plan === 'institution' ? r.plan : 'free';
  return {
    id: r.id,
    institutionId: r.institutionId,
    ltiSub: r.ltiSub,
    email: r.email,
    displayName: r.displayName,
    role: r.role === 'institution_admin' ? 'institution_admin' : 'instructor',
    plan,
    createdAt: r.createdAt,
  };
}

export function mapResource(r: {
  id: string;
  instructorId: string;
  youtubeVideoId: string;
  defaultCaptionId: string | null;
  ltiResourceLinkId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CaptionedResource {
  return {
    id: r.id,
    instructorId: r.instructorId,
    youtubeVideoId: r.youtubeVideoId,
    defaultCaptionId: r.defaultCaptionId,
    ltiResourceLinkId: r.ltiResourceLinkId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function mapInstitution(r: {
  id: string;
  name: string;
  ltiIss: string;
  ltiClientId: string;
  ltiDeploymentId: string;
  licenseMaxViewsPerTerm: number | null;
  createdAt: Date;
}): Institution {
  return {
    id: r.id,
    name: r.name,
    ltiIss: r.ltiIss,
    ltiClientId: r.ltiClientId,
    ltiDeploymentId: r.ltiDeploymentId,
    licenseMaxViewsPerTerm: r.licenseMaxViewsPerTerm,
    createdAt: r.createdAt,
  };
}
