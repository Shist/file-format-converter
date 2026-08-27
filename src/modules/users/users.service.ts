import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { RoleEntity } from '../rbac/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'createdAt', 'updatedAt'],
      relations: ['role'],
    });
  }

  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      select: ['id', 'email', 'createdAt', 'updatedAt'],
      relations: ['role'],
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID=${id} is not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async create(
    email: string,
    plainPassword: string,
    roleName: string = 'user',
  ): Promise<User> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    let role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      role = this.roleRepository.create({ name: roleName });
      await this.roleRepository.save(role);
    }

    const newUser = this.userRepository.create({ email, passwordHash, role });
    const savedUser = await this.userRepository.save(newUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = savedUser;

    return userWithoutPassword as User;
  }
}
