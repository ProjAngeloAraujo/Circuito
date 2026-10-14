import { Module } from '@nestjs/common';
import { TriagemModule } from '../triagem/triagem.module';
import { SessoesController } from './sessoes.controller';
import { SessoesService } from './sessoes.service';

@Module({
  imports: [TriagemModule],
  controllers: [SessoesController],
  providers: [SessoesService],
})
export class SessoesModule {}
