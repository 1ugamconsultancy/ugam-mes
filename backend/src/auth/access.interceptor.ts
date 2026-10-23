import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { accessStorage } from './access-context';

@Injectable()
export class AccessInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const actor = context.switchToHttp().getRequest().user;
    return new Observable(subscriber => {
      let subscription;
      accessStorage.run(actor, () => { subscription = next.handle().subscribe(subscriber); });
      return () => subscription?.unsubscribe();
    });
  }
}
