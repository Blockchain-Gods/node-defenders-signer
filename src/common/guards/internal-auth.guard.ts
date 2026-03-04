// Rejects any request that doesn't carry the correct X-Internal-Key header. Applied globally in app.module.ts.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-internal-key'];
    const expected = this.config.get<string>('internalApiKey');

    if (!key || key !== expected) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
