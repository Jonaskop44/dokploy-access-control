import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../config/prisma/generated/enums.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import {
  EffectiveLimitsResponseDto,
  LimitResponseDto,
} from './dto/limit-response.dto.js';
import { UpdateLimitDto } from './dto/update-limit.dto.js';
import { LimitService } from './limit.service.js';

@Controller('limits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LimitController {
  constructor(private readonly limitService: LimitService) {}

  @Get('me')
  @SerializeOptions({
    type: EffectiveLimitsResponseDto,
    excludeExtraneousValues: true,
  })
  @ApiOkResponse({ type: EffectiveLimitsResponseDto })
  findMine(@CurrentUser('id') userId: string) {
    return this.limitService.resolveForUserId(userId);
  }

  @Get()
  @Roles(Role.TEACHER)
  @SerializeOptions({ type: LimitResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: LimitResponseDto, isArray: true })
  findAll() {
    return this.limitService.findAll();
  }

  @Patch('global')
  @Roles(Role.TEACHER)
  @SerializeOptions({ type: LimitResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: LimitResponseDto })
  setGlobal(@Body() dto: UpdateLimitDto) {
    return this.limitService.setGlobal(dto);
  }

  @Patch('classes/:className')
  @Roles(Role.TEACHER)
  @SerializeOptions({ type: LimitResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: LimitResponseDto })
  setForClass(
    @Param('className') className: string,
    @Body() dto: UpdateLimitDto,
  ) {
    return this.limitService.setForClass(className, dto);
  }

  @Patch('users/:userId')
  @Roles(Role.TEACHER)
  @SerializeOptions({ type: LimitResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: LimitResponseDto })
  setForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateLimitDto,
  ) {
    return this.limitService.setForUser(userId, dto);
  }

  @Delete('classes/:className')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEACHER)
  @ApiNoContentResponse()
  removeForClass(@Param('className') className: string) {
    return this.limitService.removeForClass(className);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.TEACHER)
  @ApiNoContentResponse()
  removeForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.limitService.removeForUser(userId);
  }
}
