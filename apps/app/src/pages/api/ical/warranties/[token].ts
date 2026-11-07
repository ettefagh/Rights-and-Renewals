import type { APIRoute } from 'astro';
import { generateWarrantiesIcal, type WalletItem } from '@cmlab/core';
import { verifyIcalToken } from '../../../../lib/server/auth/session.js';

export const GET: APIRoute = async ({ params, locals, url }) => {
  const token = params.token || '';
  const env = (locals as any)?.runtime?.env;

  if (token && token !== 'demo' && token !== 'default') {
    const verifiedEmail = await verifyIcalToken(token, env);
    if (!verifiedEmail) {
      return new Response('Invalid or expired calendar subscription token.', {
        status: 401,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }

  const sampleWarranties: WalletItem[] = [
    {
      id: 'hw-macbook-sample',
      title: 'Apple MacBook Pro 14" M3',
      category: 'hardware',
      brandSlug: 'apple',
      merchantOrProvider: 'Apple Store Berlin',
      purchaseDate: '2025-10-15',
      expiryDate: '2027-10-15',
      priceGrossEur: 1899.0,
      status: 'active',
      isTaxDeductible: true,
      hasProofOfPurchase: true,
      searchTokens: ['apple', 'macbook', 'laptop'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  const ics = generateWarrantiesIcal(sampleWarranties, {
    baseAppUrl: url.origin
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="warranties.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
