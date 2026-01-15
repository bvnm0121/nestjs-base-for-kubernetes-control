import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { KubernetesModule } from './modules/kubernetes/kubernetes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.${process.env.NODE_ENV}.env`, '.env'],
      validationSchema: envValidationSchema,
    }),
    KubernetesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
