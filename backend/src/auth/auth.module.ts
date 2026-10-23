import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtSecret } from './security-config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AccessInterceptor } from './access.interceptor';
import { AuthGuard } from './auth.guard';
import { User } from './user.entity';
import { Plant } from '../plants/plants.entity';
import { Organization } from '../enterprise/organization.entity';
import { PlantThemeSetting } from '../enterprise/plant-theme.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Plant, Organization, PlantThemeSetting]),
    JwtModule.register({
      global: true,
      secret: jwtSecret,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  providers: [AuthService, AuthGuard, { provide: APP_GUARD, useExisting: AuthGuard }, { provide: APP_INTERCEPTOR, useClass: AccessInterceptor }],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, TypeOrmModule],
})
export class AuthModule {}
