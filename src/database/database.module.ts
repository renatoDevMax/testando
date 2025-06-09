import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://renatodevfidelidade:maxjr1972@clusterrenato.asbtntk.mongodb.net/ecoFidelidade?retryWrites=true&w=majority&appName=clusterRenato',
    ),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
//adicionando qualquer merdaaaaaa
