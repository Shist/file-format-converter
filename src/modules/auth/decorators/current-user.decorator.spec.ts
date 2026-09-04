import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';

type CustomParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

function getParamDecoratorFactory(): CustomParamFactory {
  class TestController {
    public testMethod(@CurrentUser() user: unknown) {
      return user;
    }
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'testMethod',
  ) as Record<string, { factory: CustomParamFactory }>;

  const key = Object.keys(args)[0];
  return args[key].factory;
}

describe('CurrentUser Decorator', () => {
  it('should extract user property from request', () => {
    const factory = getParamDecoratorFactory();
    const mockUser = { id: '1', email: 'test@test.com' };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as unknown as ExecutionContext;

    const result = factory('id', mockContext);
    expect(result).toBe('1');
  });

  it('should return full user if no data parameter provided', () => {
    const factory = getParamDecoratorFactory();
    const mockUser = { id: '1', email: 'test@test.com' };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toEqual(mockUser);
  });
});
