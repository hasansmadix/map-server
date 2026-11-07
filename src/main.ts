import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { json } from 'express';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Required for correct req.ip behind Vercel / Cloudflare / reverse proxies
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  // Enable CORS
  app.enableCors();

  // Apply security headers
  app.use(helmet());

  // Enable compression
  app.use(compression());

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.setGlobalPrefix('api/v1');

  // Use JSON middleware but preserve raw body for Stripe webhooks
  app.use(
    json({
      limit: '10mb', // Increase body size limit
      verify: (req: any, res, buf) => {
        // Store raw body for Stripe webhook signature verification
        if (req.originalUrl.includes('/api/v1/stripe/webhooks')) {
          req.rawBody = buf;
        }
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Start the server
  const port = process.env.PORT || 6000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
