import type { FastifyReply, FastifyRequest } from 'fastify';

const COOKIE = 'cf_instructor';

export function readInstructorId(req: FastifyRequest): string | null {
  const raw = req.cookies[COOKIE];
  if (!raw) return null;
  const u = req.unsignCookie(raw);
  if (!u.valid) return null;
  return u.value;
}

export function setInstructorCookie(
  reply: FastifyReply,
  instructorId: string,
  opts: { secure: boolean },
): void {
  void reply.setCookie(COOKIE, instructorId, {
    signed: true,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: opts.secure,
    maxAge: 30 * 24 * 60 * 60,
  });
}

export function clearInstructorCookie(reply: FastifyReply, opts: { secure: boolean }): void {
  void reply.clearCookie(COOKIE, { path: '/', secure: opts.secure, sameSite: 'lax' });
}
