import { Controller, Get, SerializeOptions, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SerializeOptions({ type: UserResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }
}
