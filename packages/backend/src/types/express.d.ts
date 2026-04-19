import type { RoleType } from '@wsb/shared';

declare global {
  namespace Express {
    interface Request {
      traveler_id?: string;
      role?: RoleType;
    }
  }
}

export {};
