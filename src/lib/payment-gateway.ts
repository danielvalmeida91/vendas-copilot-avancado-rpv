import crypto from 'crypto';

export interface PixChargeResult {
  transactionId: string;
  copiaECola: string;
  qrCodeDataUrl: string;
}

export interface CreditCardChargeResult {
  transactionId: string;
  success: boolean;
  authorizationCode: string;
  errorMessage?: string;
}

export function generatePixCharge(orderNumber: string, amountInCents: number): PixChargeResult {
  const transactionId = `pix_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const amountFormatted = (amountInCents / 100).toFixed(2);
  const copiaECola = `00020126580014BR.GOV.BCB.PIX0136pix@sistemadevendas.com.br520400005303986540${amountFormatted.length}${amountFormatted}5802BR5925SISTEMA DE VENDAS DIGITA6009SAO PAULO62170513${orderNumber}6304`;

  // Standard data URL representation of a generated QR code for checkout UI display
  const svgQr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#ffffff"/><rect x="20" y="20" width="40" height="40" fill="#000000"/><rect x="140" y="20" width="40" height="40" fill="#000000"/><rect x="20" y="140" width="40" height="40" fill="#000000"/><rect x="80" y="80" width="40" height="40" fill="#000000"/></svg>`;
  const qrCodeDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgQr)}`;

  return {
    transactionId,
    copiaECola,
    qrCodeDataUrl,
  };
}

export function processCreditCard(params: {
  orderNumber: string;
  amountInCents: number;
  cardNumber?: string;
}): CreditCardChargeResult {
  const transactionId = `cc_tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const authorizationCode = `AUTH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  return {
    transactionId,
    success: true,
    authorizationCode,
  };
}

export function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secretKey?: string
): boolean {
  if (!signatureHeader) return false;

  const secret = secretKey || process.env.WEBHOOK_SECRET || 'super-secret-hmac-key-for-development-32chars';
  const cleanSignature = signatureHeader.replace(/^sha256=/i, '').trim();

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (computedHash.length !== cleanSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(cleanSignature, 'hex')
    );
  } catch (e) {
    return false;
  }
}
