import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtPayload } from './jwt.strategy';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: AuthCredentialsDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: AuthCredentialsDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: JwtPayload, @Body() body: UpdateMeDto) {
    const player = await this.authService.updateMyProfile(user.sub, {
      team: body.team,
      playerName: body.playerName,
    });
    return { player };
  }
}
