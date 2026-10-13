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
  Post,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ProjectResponseDto } from './dto/project-response.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectService } from './project.service.js';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @SerializeOptions({ type: ProjectResponseDto, excludeExtraneousValues: true })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectService.create(userId, dto);
  }

  @Get()
  @SerializeOptions({ type: ProjectResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  findAll(@CurrentUser('id') userId: string) {
    return this.projectService.findAll(userId);
  }

  @Get(':id')
  @SerializeOptions({ type: ProjectResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: ProjectResponseDto })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectService.findOne(userId, id);
  }

  @Patch(':id')
  @SerializeOptions({ type: ProjectResponseDto, excludeExtraneousValues: true })
  @ApiOkResponse({ type: ProjectResponseDto })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectService.remove(userId, id);
  }
}
