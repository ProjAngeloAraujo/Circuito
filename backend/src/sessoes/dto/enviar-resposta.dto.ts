import { IsNotEmpty, IsString } from 'class-validator';

export class EnviarRespostaDto {
  @IsString()
  @IsNotEmpty()
  texto!: string;
}
