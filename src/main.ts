import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const nodeEnv =
    configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    const envWhitelist = [
      'NODE_ENV',
      'APP_PORT',
      'API_PREFIX',
      'CORS_ORIGINS',
      'KUBERNETES_NAMESPACE',
      'KUBERNETES_LOCAL_CONFIG_PATH',
    ];
    envWhitelist.forEach((key) => {
      const value = configService.get<string>(key) ?? process.env[key];
      Logger.log(`Env (dev/test): ${key}=${value ?? ''}`);
    });
  }

  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  if (apiPrefix?.trim()) {
    app.setGlobalPrefix(apiPrefix);
  }

  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Starter API')
    .setDescription('Lightweight boilerplate API. Update title/description for your service.')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('APP_PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`Server is running on port ${port}`);
}
bootstrap();
