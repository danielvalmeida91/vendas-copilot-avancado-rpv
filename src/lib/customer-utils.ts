import { Prisma, PrismaClient } from '@prisma/client';

export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export async function findOrCreateCustomer(
  tx: Prisma.TransactionClient | PrismaClient,
  data: { name: string; email: string; cpf: string }
) {
  const cleanCpf = normalizeCpf(data.cpf);
  let user = await tx.user.findFirst({
    where: {
      OR: [{ email: data.email }, { cpf: cleanCpf }],
    },
  });

  if (!user) {
    user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        cpf: cleanCpf,
        passwordHash: null,
        role: 'CUSTOMER',
      },
    });
  }

  return user;
}
