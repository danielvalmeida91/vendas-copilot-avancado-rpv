import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { authenticateUser } from '@/services/auth.service';

describe('Authentication Seam (Login by Email or CPF)', () => {
  let testUserId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'login.test@example.com' },
    });

    const user = await prisma.user.create({
      data: {
        name: 'Usuario Login Teste',
        email: 'login.test@example.com',
        cpf: '12398745600',
        role: 'CUSTOMER',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: 'login.test@example.com' },
    });
    await prisma.$disconnect();
  });

  it('authenticates user by exact email', async () => {
    const result = await authenticateUser({ identifier: 'login.test@example.com' });
    expect(result.success).toBe(true);
    expect(result.user?.id).toBe(testUserId);
    expect(result.user?.name).toBe('Usuario Login Teste');
  });

  it('authenticates user by CPF with or without punctuation', async () => {
    const resultWithMask = await authenticateUser({ identifier: '123.987.456-00' });
    expect(resultWithMask.success).toBe(true);
    expect(resultWithMask.user?.id).toBe(testUserId);

    const resultWithoutMask = await authenticateUser({ identifier: '12398745600' });
    expect(resultWithoutMask.success).toBe(true);
    expect(resultWithoutMask.user?.id).toBe(testUserId);
  });

  it('fails with clear error when user is not found', async () => {
    const result = await authenticateUser({ identifier: 'inexistente@example.com' });
    expect(result.success).toBe(false);
    expect(result.error?.toLowerCase()).toContain('não encontrado');
  });
});
