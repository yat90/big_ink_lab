import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  getHello(): { message: string } {
    return { message: 'Hello from NestJS API' };
  }

  getHealth(): { status: string; mongo: string } {
    const mongoStatus = this.mongo.readyState === 1 ? 'connected' : 'disconnected';
    return { status: 'ok', mongo: mongoStatus };
  }
}
