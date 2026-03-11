import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MONGO_READY_STATE_CONNECTED } from './constants';

/** Response shape for health check. */
export interface HealthCheckResult {
  status: string;
  mongo: string;
}

@Injectable()
export class AppService {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  /** Returns a simple greeting message. */
  getHello(): { message: string } {
    return { message: 'Hello from NestJS API' };
  }

  /** Returns health status including MongoDB connection state. */
  getHealth(): HealthCheckResult {
    const mongoStatus =
      this.mongo.readyState === MONGO_READY_STATE_CONNECTED ? 'connected' : 'disconnected';
    return { status: 'ok', mongo: mongoStatus };
  }
}
