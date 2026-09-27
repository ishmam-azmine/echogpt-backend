import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData => {
    const request = context.switchToHttp().getRequest<{
      user: CurrentUserData;
    }>();

    return request.user;
  },
);
