import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get() @ApiOperation({ summary: 'Get all users' })
  findAll() { return this.usersService.findAll(); }

  @Get(':id') @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) { return this.usersService.findOne(id); }

  @Post() @ApiOperation({ summary: 'Create user' })
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Patch(':id') @ApiOperation({ summary: 'Update user' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id', ParseIntPipe) id: number) { return this.usersService.remove(id); }
}
