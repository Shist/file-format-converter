import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID=${id} is not found`);
    }
    return user;
  }

  // TODO: hash password
  async create(
    email: string,
    passwordHash: string,
    role: Role = Role.USER,
  ): Promise<User> {
    const newUser = this.userRepository.create({ email, passwordHash, role });
    return this.userRepository.save(newUser);
  }
}
