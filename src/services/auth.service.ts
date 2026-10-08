import { prisma } from '@/lib/prisma';
import { normalizeCpf } from '@/lib/customer-utils';

export interface AuthenticateInput {
  identifier: string;
  password?: string;
}

export interface AuthenticateResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    role: string;
  };
  error?: string;
}

export async function authenticateUser(input: AuthenticateInput): Promise<AuthenticateResult> {
  const trimmed = input.identifier.trim();
  if (!trimmed) {
    return {
      success: false,
      error: 'Informe seu e-mail ou CPF para entrar.',
    };
  }

  const isEmail = trimmed.includes('@');
  const cleanCpf = normalizeCpf(trimmed);

  let user = null;

  if (isEmail) {
    user = await prisma.user.findUnique({
      where: { email: trimmed.toLowerCase() },
    });
  } else if (cleanCpf.length === 11) {
    user = await prisma.user.findUnique({
      where: { cpf: cleanCpf },
    });
  } else {
    // Attempt fallback search
    user = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmed }, { cpf: cleanCpf }],
      },
    });
  }

  if (!user) {
    return {
      success: false,
      error: 'Usuário não encontrado com o e-mail ou CPF informado.',
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      role: user.role,
    },
  };
}
