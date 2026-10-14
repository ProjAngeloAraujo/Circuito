import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SessoesModule } from './sessoes/sessoes.module';

@Module({
  imports: [SessoesModule],
  controllers: [AppController],
})
export class AppModule {}
