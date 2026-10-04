import { Controller, Get, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(UserResponseDto)
  me(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }
}
