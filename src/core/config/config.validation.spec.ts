import { configValidationSchema } from './config.validation';

describe('Config Validation', () => {
  it('should return valid config with defaults when optional fields are missing', () => {
    const validEnv = {
      PORT: 3000,
      NODE_ENV: 'development',
      COOKIE_SECRET: 'super-secret',
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: 5432,
      POSTGRES_USER: 'test_user',
      POSTGRES_PASSWORD: 'test_password',
      POSTGRES_DB: 'test_db',
    };

    const result = configValidationSchema.validate(validEnv);

    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();

    expect(result.value).toMatchObject({
      HEALTH_CHECK_ENABLED: false,
      THROTTLE_GLOBAL_TTL: 10000,
      MAX_FILE_SIZE: 52428800,
    });
  });

  it('should return an error if required fields are missing', () => {
    const invalidEnv = {
      PORT: 3000,
    };

    const result = configValidationSchema.validate(invalidEnv);

    expect(result.error).toBeDefined();
  });
});
