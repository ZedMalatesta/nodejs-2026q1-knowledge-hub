import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function strip(value: any): any {
  if (Array.isArray(value)) {
    return value.map(strip);
  }

  if (value !== null && typeof value === 'object') {
    if ('data' in value && Array.isArray(value.data)) {
      return { ...value, data: value.data.map(strip) };
    }

    const rest = { ...value };
    delete rest.password;
    return rest;
  }

  return value;
}

@Injectable()
export class StripPasswordInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(strip));
  }
}
