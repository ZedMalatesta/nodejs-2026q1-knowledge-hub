import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ApiTags } from '@nestjs/swagger';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: Record<string, any>) {
    if (!body || typeof body.refreshToken !== 'string' || !body.refreshToken) {
      throw new UnauthorizedException('Invalid DTO');
    }
    return this.authService.refresh({ refreshToken: body.refreshToken } as RefreshDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() body: Record<string, any>) {
    if (!body || typeof body.refreshToken !== 'string' || !body.refreshToken) {
      throw new UnauthorizedException('Invalid DTO');
    }
    return this.authService.logout({ refreshToken: body.refreshToken } as RefreshDto);
  }

  @Public()
  @Post('admin-create')
  @HttpCode(HttpStatus.CREATED)
  adminCreate(@Body() signupDto: SignupDto) {
    return this.authService.adminCreate(signupDto);
  }
}
