import type { APIRoute } from 'astro';
import { generateSubscriptionsIcal, type WalletItem } from '@cmlab/core';

export const GET: APIRoute = async ({ url }) => {
  const sampleSubscriptions: WalletItem[] = [
    {
      id: 'sub-spotify-sample',
      title: 'Spotify Premium Student',
      category: 'subscription',
      brandSlug: 'spotify',
      merchantOrProvider: 'Spotify AB',
      purchaseDate: '2026-01-01',
      expiryDate: '2026-12-01',
      priceGrossEur: 5.99,
      status: 'active',
      isTaxDeductible: false,
      cancellationUrl: 'https://www.spotify.com/account/subscription/cancel/',
      hasProofOfPurchase: false,
      searchTokens: ['spotify', 'music', 'streaming', 'student'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];

  const ics = generateSubscriptionsIcal(sampleSubscriptions, {
    baseAppUrl: url.origin
  });

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="subscriptions.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
