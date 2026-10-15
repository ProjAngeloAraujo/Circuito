import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PesquisaModule } from './pesquisa/pesquisa.module';
import { SessoesModule } from './sessoes/sessoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SessoesModule,
    PesquisaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
