import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as hbs from 'hbs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilitar CORS para permitir requisições de qualquer origem
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const viewsPath = join(__dirname, '..', 'views');

  // Configurar diretórios estáticos e de views
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');

  // Registrar parciais do Handlebars
  hbs.registerPartials(join(viewsPath, 'components'));

  console.log('Parciais registrados em:', join(viewsPath, 'components'));

  // Usar a porta fornecida pelo ambiente ou 3000 como fallback
  const PORT = process.env.PORT || 3000;
  console.log(`Servidor iniciando na porta: ${PORT}`);

  await app.listen(PORT);
}
bootstrap();
