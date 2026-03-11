import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { MatchesModule } from './matches/matches.module';
import { PlayersModule } from './players/players.module';
import { DecksModule } from './decks/decks.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DEFAULT_MONGODB_URI, DEFAULT_DB_NAME } from './constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? DEFAULT_MONGODB_URI,
        dbName: DEFAULT_DB_NAME,
      }),
    }),
    CoreModule,
    PlayersModule,
    MatchesModule,
    DecksModule,
    AuthModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
