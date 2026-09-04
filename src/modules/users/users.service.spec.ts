import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { RoleEntity } from '../rbac/entities/role.entity';

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('test-salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;
  let roleRepository: MockRepository<RoleEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    roleRepository = module.get(getRepositoryToken(RoleEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    let qbMock: Partial<Record<keyof SelectQueryBuilder<User>, jest.Mock>>;

    beforeEach(() => {
      qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      userRepository.createQueryBuilder?.mockReturnValue(qbMock);
    });

    it('should return paginated users without cursor', async () => {
      const mockUsers = [{ id: '1', createdAt: new Date() } as User];
      qbMock.getMany?.mockResolvedValue([...mockUsers]);

      const result = await service.findAll({
        limit: 20,
        sort: 'createdAt',
        order: 'DESC',
      });

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(qbMock.take).toHaveBeenCalledWith(21);
      expect(result.items).toEqual(mockUsers);
      expect(result.nextCursor).toBeNull();
    });

    it('should apply search query and generate nextCursor if there are more items', async () => {
      const date1 = new Date('2026-01-01');
      const date2 = new Date('2026-01-02');
      const mockUsers = [
        { id: '2', email: 'test2@test.com', createdAt: date2 } as User,
        { id: '1', email: 'test1@test.com', createdAt: date1 } as User,
      ];
      qbMock.getMany?.mockResolvedValue([...mockUsers]);

      const result = await service.findAll({
        limit: 1,
        q: 'test',
        sort: 'createdAt',
        order: 'DESC',
      });

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        '(user.email ILIKE :q OR CAST(user.id AS TEXT) = :q)',
        { q: '%test%' },
      );

      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe('2');

      const expectedCursor = Buffer.from(`${date2.getTime()}_2`).toString(
        'base64',
      );
      expect(result.nextCursor).toBe(expectedCursor);
    });

    it('should decode cursor and apply where clause', async () => {
      const cursorTime = new Date().getTime();
      const cursorStr = Buffer.from(`${cursorTime}_1`).toString('base64');
      qbMock.getMany?.mockResolvedValue([]);

      await service.findAll({
        limit: 20,
        cursor: cursorStr,
        sort: 'createdAt',
        order: 'DESC',
      });

      expect(qbMock.andWhere).toHaveBeenCalledWith(
        `(user.createdAt < :date OR (user.createdAt = :date AND user.id < :id))`,
        expect.any(Object),
      );
    });
  });

  describe('findOneById', () => {
    it('should return a user if found', async () => {
      const mockUser = { id: '1', email: 'test@test.com' } as User;
      userRepository.findOne?.mockResolvedValue(mockUser);

      const result = await service.findOneById('1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      userRepository.findOne?.mockResolvedValue(null);

      await expect(service.findOneById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const mockUser = { id: '1', email: 'test@test.com' } as User;
      userRepository.findOne?.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should successfully create a new user with a hashed password', async () => {
      const mockRole = { id: 'role-1', name: 'user' } as RoleEntity;
      const mockSavedUser = {
        id: '1',
        email: 'new@test.com',
        passwordHash: 'hashed-password',
        role: mockRole,
      } as User;

      roleRepository.findOne?.mockResolvedValue(mockRole);
      userRepository.create?.mockReturnValue(mockSavedUser);
      userRepository.save?.mockResolvedValue(mockSavedUser);

      const result = await service.create(
        'new@test.com',
        'plain-password',
        'user',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 'test-salt');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('new@test.com');
    });
  });

  describe('update', () => {
    it('should update user password', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        passwordHash: 'old-hash',
      } as User;
      userRepository.findOne?.mockResolvedValue(mockUser);
      userRepository.save?.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed-password',
      } as User);

      const result = await service.update('1', { password: 'new-password' });

      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 'test-salt');
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should update user role', async () => {
      const mockUser = { id: '1', email: 'test@test.com' } as User;
      const mockRole = { id: 'role-2', name: 'admin' } as RoleEntity;

      userRepository.findOne?.mockResolvedValue(mockUser);
      roleRepository.findOne?.mockResolvedValue(mockRole);
      userRepository.save?.mockResolvedValue({
        ...mockUser,
        role: mockRole,
      } as User);

      const result = await service.update('1', { role: 'admin' });

      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'admin' },
      });
      expect(result.role?.name).toBe('admin');
    });

    it('should throw NotFoundException if role does not exist', async () => {
      userRepository.findOne?.mockResolvedValue({ id: '1' } as User);
      roleRepository.findOne?.mockResolvedValue(null);

      await expect(service.update('1', { role: 'fake-role' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkEmailAvailability', () => {
    it('should throw ConflictException if email is taken', async () => {
      userRepository.findOne?.mockResolvedValue({
        id: '1',
        email: 'taken@test.com',
      } as User);
      await expect(
        service.checkEmailAvailability('taken@test.com'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateEmail', () => {
    it('should update user email', async () => {
      const mockUser = {
        id: '1',
        email: 'old@test.com',
        passwordHash: 'hash',
      } as User;
      userRepository.findOne?.mockResolvedValue(mockUser);
      userRepository.save?.mockResolvedValue({
        ...mockUser,
        email: 'new@test.com',
      } as User);

      const result = await service.updateEmail('1', 'new@test.com');
      expect(result.email).toBe('new@test.com');
    });
  });

  describe('remove', () => {
    it('should remove an existing user', async () => {
      const mockUser = { id: '1', email: 'del@test.com' } as User;
      userRepository.findOne?.mockResolvedValue(mockUser);
      userRepository.remove?.mockResolvedValue(mockUser);

      await service.remove('1');
      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });
  });
});
