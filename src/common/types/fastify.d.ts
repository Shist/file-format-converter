import { ActiveUserData } from '../../modules/auth/interfaces/active-user-data.interface';

declare module 'fastify' {
  interface FastifyRequest {
    user?: ActiveUserData;
  }
}
