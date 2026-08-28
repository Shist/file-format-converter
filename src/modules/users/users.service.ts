import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { RoleEntity } from '../rbac/entities/role.entity';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async findAll(
    query: GetUsersQueryDto = { limit: 20, sort: 'createdAt', order: 'DESC' },
  ) {
    const { cursor, limit, q, sort, order } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .select([
        'user.id',
        'user.email',
        'user.createdAt',
        'user.updatedAt',
        'role.id',
        'role.name',
      ]);

    // Поиск по email или ID
    if (q) {
      qb.andWhere('(user.email ILIKE :q OR CAST(user.id AS TEXT) = :q)', {
        q: `%${q}%`,
      });
    }

    // Декодирование и применение курсора
    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('ascii');
      const [cursorSortValue, cursorId] = decodedCursor.split('_');

      const operator = order === 'DESC' ? '<' : '>';

      if (sort === 'createdAt') {
        const date = new Date(Number(cursorSortValue));
        qb.andWhere(
          `(user.createdAt ${operator} :date OR (user.createdAt = :date AND user.id ${operator} :id))`,
          { date, id: cursorId },
        );
      } else {
        qb.andWhere(
          `(user.${sort} ${operator} :val OR (user.${sort} = :val AND user.id ${operator} :id))`,
          { val: cursorSortValue, id: cursorId },
        );
      }
    }

    // Принудительно добавляем сортировку по ID для стабильности пагинации
    qb.orderBy(`user.${sort}`, order)
      .addOrderBy('user.id', order)
      .take(limit + 1); // Берем на 1 больше, чтобы понять, есть ли следующая страница

    const users = await qb.getMany();
    const hasNextPage = users.length > limit;

    if (hasNextPage) {
      users.pop(); // Удаляем лишний элемент
    }

    // Генерация следующего курсора
    let nextCursor: string | null = null;
    if (hasNextPage && users.length > 0) {
      const lastUser = users[users.length - 1];
      const sortValue =
        sort === 'createdAt' ? lastUser.createdAt.getTime() : lastUser[sort];
      nextCursor = Buffer.from(`${sortValue}_${lastUser.id}`).toString(
        'base64',
      );
    }

    return {
      items: users,
      nextCursor,
    };
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

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOneById(id);

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(dto.password, salt);
    }

    if (dto.role) {
      const role = await this.roleRepository.findOne({
        where: { name: dto.role },
      });
      if (!role) {
        throw new NotFoundException(`Role ${dto.role} is not found`);
      }
      user.role = role;
    }

    const updatedUser = await this.userRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async checkEmailAvailability(email: string): Promise<void> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('This email is already in use');
    }
  }

  async updateEmail(id: string, newEmail: string): Promise<User> {
    const user = await this.findOneById(id);
    user.email = newEmail;

    const updatedUser = await this.userRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOneById(id);
    await this.userRepository.remove(user);
  }
}
