import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('hello')
  getHello(): { message: string } {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  health() {
    return this.appService.getHealth();
  }
}
