import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { D1Service } from './d1/d1.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init(); // ensures all onModuleInit hooks complete

  const logger = new Logger('Bootstrap');

  const d1 = app.get(D1Service);
  await d1.migrate();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Signer service running on port ${port}`);
}

bootstrap();
