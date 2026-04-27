// NOWPayments integration — coin purchases (invoices) + gem withdrawals
// (mass payouts), plus the IPN webhook that drives status updates.
//
// Required secrets (set with `firebase functions:secrets:set`):
//   NOWPAYMENTS_API_KEY      — REST API key from the NOWPayments dashboard
//   NOWPAYMENTS_IPN_SECRET   — IPN/webhook signing secret
//   NOWPAYMENTS_2FA_KEY      — TOTP secret for the payout-confirm endpoint
//                              (NOWPayments requires 2FA on payouts)
//
// Constants and the price floor live in src/utils/vpSystem.js. Anything that
// affects money should reference COIN_PACKS / FIRST_PURCHASE_DISCOUNT there.

const functions = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const crypto = require('crypto');
const speakeasy = (() => { try { return require('speakeasy'); } catch { return null; } })();
const { LIMITS, checkRateLimit } = require('./economy');

const db = getFirestore('vgrdb');

const NOWPAYMENTS_API_KEY    = defineSecret('NOWPAYMENTS_API_KEY');
const NOWPAYMENTS_IPN_SECRET = defineSecret('NOWPAYMENTS_IPN_SECRET');
const NOWPAYMENTS_2FA_KEY    = defineSecret('NOWPAYMENTS_2FA_KEY');

const REGION = 'europe-west1';
const NP_BASE = 'https://api.nowpayments.io/v1';

// ── Pack catalog (server-of-truth for price validation) ────────────
// Mirrors src/utils/vpSystem.js → COIN_PACKS. Keep in sync.
const COIN_PACKS = {
  starter:   { name: 'Starter Pack',   coins: 100,   vpBonus: 0,    priceEUR: 0.99 },
  gamer:     { name: 'Gamer Pack',     coins: 500,   vpBonus: 0,    priceEUR: 4.79 },
  pro:       { name: 'Pro Pack',       coins: 1200,  vpBonus: 0,    priceEUR: 11.49 },
  elite:     { name: 'Elite Pack',     coins: 2500,  vpBonus: 0,    priceEUR: 22.99 },
  legend:    { name: 'Legend Pack',    coins: 5000,  vpBonus: 0,    priceEUR: 44.99 },
  champion:  { name: 'Champion Pack',  coins: 10000, vpBonus: 0,    priceEUR: 89.99 },
  titan:     { name: 'Titan Pack',     coins: 15000, vpBonus: 1500, priceEUR: 134.99 },
  ascendant: { name: 'Ascendant Pack', coins: 25000, vpBonus: 3000, priceEUR: 224.99 },
};
const FIRST_PURCHASE_DISCOUNT_PCT = 0.20;
const PAYOUT_SPREAD_PCT = 0.02;     // 2% platform spread on gem→crypto
const PAYOUT_MIN_GEMS   = 1000;
const QUOTE_TTL_MS      = 60_000;   // 60s
const SMALL_PAYOUT_AUTO_APPROVE_EUR = LIMITS.PAYOUT_AUTO_APPROVE_EUR; // €500 threshold from economy module
const PAYOUT_DAILY_CAP_EUR        = LIMITS.PAYOUT_DAILY_EUR;         // €1,000 / 24h

const npClient = (apiKey) => axios.create({
  baseURL: NP_BASE,
  headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
  timeout: 15000,
});

const requireAuth = (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  return uid;
};

const finalPriceEUR = (priceEUR, firstPurchase) => {
  if (!firstPurchase) return +priceEUR.toFixed(2);
  return +(priceEUR * (1 - FIRST_PURCHASE_DISCOUNT_PCT)).toFixed(2);
};

// ════════════════════════════════════════════════════════════════════
// 1. createPurchaseInvoice — user clicks "Pay" on a pack
// ════════════════════════════════════════════════════════════════════
// Input:  { packId: 'starter' | ..., payCurrency?: 'btc' | 'eth' | 'usdttrc20' | ... | 'fiat' }
// Output: { invoiceUrl, invoiceId, orderId, finalPriceEUR, savingEUR }
//
// Creates a NOWPayments invoice (their hosted checkout supports both crypto
// and fiat-via-Banxa). The merchant account is configured in the NOWPayments
// dashboard to auto-convert all incoming crypto to USDT, so we always settle
// in stablecoin regardless of how the user paid.

exports.createPurchaseInvoice = functions.https.onCall(
  { region: REGION, secrets: [NOWPAYMENTS_API_KEY], cors: true },
  async (request) => {
    const uid = requireAuth(request);
    const { packId } = request.data || {};

    const pack = COIN_PACKS[packId];
    if (!pack) throw new functions.https.HttpsError('invalid-argument', 'Unknown pack');

    // Look up user state for first-purchase eligibility
    const walletRef = db.collection('wallets').doc(uid);
    const walletSnap = await walletRef.get();
    const firstPurchase = !walletSnap.exists || !walletSnap.data().firstPurchaseUsed;
    const priceEUR = finalPriceEUR(pack.priceEUR, firstPurchase);
    const savingEUR = +(pack.priceEUR - priceEUR).toFixed(2);

    const orderId = `vrg_${uid.slice(0, 8)}_${Date.now()}_${packId}`;

    // Persist the pending purchase BEFORE calling NOWPayments so that even if
    // the network call dies we still have a record we can reconcile against.
    const purchaseRef = db.collection('purchases').doc(orderId);
    await purchaseRef.set({
      orderId,
      userId: uid,
      packId,
      packName: pack.name,
      coins: pack.coins,
      vpBonus: pack.vpBonus || 0,
      priceEUR,
      basePriceEUR: pack.priceEUR,
      savingEUR,
      firstPurchase,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    // Build the NOWPayments invoice. `payment_currency` is omitted so the
    // hosted checkout shows ALL options (crypto + Banxa-fiat).
    let invoice;
    try {
      const np = npClient(NOWPAYMENTS_API_KEY.value());
      const resp = await np.post('/invoice', {
        price_amount: priceEUR,
        price_currency: 'eur',
        order_id: orderId,
        order_description: `${pack.name} — ${pack.coins} VC Coins${pack.vpBonus ? ` + ${pack.vpBonus} VP` : ''}`,
        ipn_callback_url: `https://${REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/nowpaymentsIpn`,
        success_url: `${request.data?.appUrl || 'https://vergr-44494.web.app'}/#/wallet?purchase=success`,
        cancel_url:  `${request.data?.appUrl || 'https://vergr-44494.web.app'}/#/buy-coins?purchase=cancelled`,
        is_fee_paid_by_user: true,    // user covers network fee
        is_fixed_rate: true,
      });
      invoice = resp.data;
    } catch (err) {
      console.error('NOWPayments invoice creation failed', err.response?.data || err.message);
      await purchaseRef.update({ status: 'failed', failureReason: 'invoice_creation_failed' });
      throw new functions.https.HttpsError('internal', 'Could not create invoice — try again');
    }

    await purchaseRef.update({
      invoiceId: invoice.id,
      invoiceUrl: invoice.invoice_url,
      status: 'awaiting_payment',
    });

    return {
      orderId,
      invoiceId: invoice.id,
      invoiceUrl: invoice.invoice_url,
      finalPriceEUR: priceEUR,
      savingEUR,
      firstPurchase,
    };
  }
);

// ════════════════════════════════════════════════════════════════════
// 2. nowpaymentsIpn — webhook for invoice + payout status updates
// ════════════════════════════════════════════════════════════════════
// NOWPayments POSTs JSON with header `x-nowpayments-sig` = HMAC-SHA512 of the
// **alphabetically-sorted** request body using the IPN secret.
// Two payload shapes land here: invoice/payment status (for purchases) and
// payout/mass-payout status (for withdrawals). We dispatch on field shape.

const sortObjectKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => {
      acc[k] = sortObjectKeys(obj[k]);
      return acc;
    }, {});
  }
  return obj;
};
const verifySig = (rawBody, sig, secret) => {
  const sorted = JSON.stringify(sortObjectKeys(JSON.parse(rawBody)));
  const expected = crypto.createHmac('sha512', secret).update(sorted).digest('hex');
  // Constant-time compare
  return sig && expected.length === sig.length &&
         crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
};

exports.nowpaymentsIpn = functions.https.onRequest(
  { region: REGION, secrets: [NOWPAYMENTS_IPN_SECRET] },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const sig = req.get('x-nowpayments-sig');
    const rawBody = JSON.stringify(req.body);
    if (!verifySig(rawBody, sig, NOWPAYMENTS_IPN_SECRET.value())) {
      console.warn('NOWPayments IPN — invalid signature');
      return res.status(401).send('Invalid signature');
    }

    const payload = req.body;
    try {
      // Invoice/payment shape: has order_id + payment_status
      if (payload.payment_status && payload.order_id) {
        await handleInvoiceUpdate(payload);
      }
      // Mass-payout shape: has batch_withdrawal_id or withdrawals[]
      else if (payload.withdrawals || payload.batch_withdrawal_id) {
        await handlePayoutUpdate(payload);
      }
      else {
        console.warn('NOWPayments IPN — unrecognised payload', payload);
      }
      return res.status(200).send('OK');
    } catch (err) {
      console.error('NOWPayments IPN handler error', err);
      return res.status(500).send('Handler error');
    }
  }
);

async function handleInvoiceUpdate(payload) {
  const { order_id, payment_status, payment_id, pay_address, pay_amount, pay_currency,
          actually_paid, outcome_amount, outcome_currency } = payload;
  const purchaseRef = db.collection('purchases').doc(order_id);
  const purchaseSnap = await purchaseRef.get();
  if (!purchaseSnap.exists) {
    console.warn('IPN for unknown purchase', order_id);
    return;
  }
  const purchase = purchaseSnap.data();

  // Persist whatever NOWPayments tells us
  await purchaseRef.update({
    status: payment_status,
    paymentId: payment_id || null,
    payAddress: pay_address || null,
    payAmount: pay_amount || null,
    payCurrency: pay_currency || null,
    settledAmount: outcome_amount || null,
    settledCurrency: outcome_currency || null,
    actuallyPaid: actually_paid || null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Credit coins/VP only on `finished` (fully settled). Use a transaction so
  // we never double-credit if NOWPayments resends the IPN.
  if (payment_status === 'finished' && !purchase.creditedAt) {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(purchaseRef);
      if (fresh.data().creditedAt) return; // someone got there first
      const walletRef = db.collection('wallets').doc(purchase.userId);
      const walletSnap = await tx.get(walletRef);
      const w = walletSnap.exists ? walletSnap.data() : {};

      if (walletSnap.exists) {
        tx.update(walletRef, {
          balance: FieldValue.increment(purchase.coins),
          totalEarned: FieldValue.increment(purchase.coins),
          ...(purchase.vpBonus ? { vp: FieldValue.increment(purchase.vpBonus) } : {}),
          ...(purchase.firstPurchase ? { firstPurchaseUsed: true } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(walletRef, {
          balance: purchase.coins,
          gems: 0,
          vp: purchase.vpBonus || 0,
          totalEarned: purchase.coins,
          totalSpent: 0,
          firstPurchaseUsed: !!purchase.firstPurchase,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(db.collection('transactions').doc(), {
        userId: purchase.userId, type: 'coin_purchase',
        amount: purchase.coins, currency: 'coins',
        description: `Bought ${purchase.packName}${purchase.savingEUR > 0 ? ` (saved €${purchase.savingEUR.toFixed(2)})` : ''}`,
        meta: { orderId: order_id, paymentId: payment_id, priceEUR: purchase.priceEUR },
        createdAt: FieldValue.serverTimestamp(),
      });
      if (purchase.vpBonus) {
        tx.set(db.collection('transactions').doc(), {
          userId: purchase.userId, type: 'pack_vp_bonus',
          amount: purchase.vpBonus, currency: 'vp',
          description: `VP bonus from ${purchase.packName}`,
          meta: { orderId: order_id }, createdAt: FieldValue.serverTimestamp(),
        });
      }
      tx.set(db.collection('notifications').doc(), {
        recipientId: purchase.userId, type: 'coins',
        title: `+${purchase.coins.toLocaleString()} coins added!`,
        body: purchase.vpBonus ? `Plus +${purchase.vpBonus.toLocaleString()} VP bonus` : 'Enjoy!',
        read: false, data: { orderId: order_id }, createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(purchaseRef, { creditedAt: FieldValue.serverTimestamp() });
    });
  }

  if (payment_status === 'failed' || payment_status === 'expired') {
    // Nothing to refund — user paid nothing, or NOWPayments returns the funds.
    // Mark for ops visibility.
    await purchaseRef.update({ failedAt: FieldValue.serverTimestamp() });
  }
}

async function handlePayoutUpdate(payload) {
  // NOWPayments mass-payout webhook shape: { batch_withdrawal_id, withdrawals: [{ id, status, ... }] }
  const items = payload.withdrawals || [payload];
  for (const w of items) {
    const payoutRef = db.collection('payouts').doc(String(w.id));
    const snap = await payoutRef.get();
    if (!snap.exists) continue;
    const data = snap.data();

    await payoutRef.update({
      status: w.status,
      hash: w.hash || null,
      payoutAddress: w.address || data.payoutAddress,
      sentAt: w.status === 'finished' ? FieldValue.serverTimestamp() : data.sentAt || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // On failure: re-credit gems atomically.
    if ((w.status === 'failed' || w.status === 'rejected') && !data.refundedAt) {
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(payoutRef);
        if (fresh.data().refundedAt) return;
        tx.update(db.collection('wallets').doc(data.userId), {
          gems: FieldValue.increment(data.gems),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(db.collection('transactions').doc(), {
          userId: data.userId, type: 'payout_refunded',
          amount: data.gems, currency: 'gems',
          description: `Withdrawal failed — gems re-credited`,
          meta: { payoutId: String(w.id) }, createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(payoutRef, { refundedAt: FieldValue.serverTimestamp() });
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. getPayoutQuote — gets a fixed-rate crypto quote from NOWPayments
// ════════════════════════════════════════════════════════════════════
// Input:  { gems: number, currency: 'btc' | 'usdttrc20' | ... }
// Output: { quoteId, cryptoAmount, gems, currency, networkFee, lockedUntil, eurValue, spreadEUR }

exports.getPayoutQuote = functions.https.onCall(
  { region: REGION, secrets: [NOWPAYMENTS_API_KEY], cors: true },
  async (request) => {
    const uid = requireAuth(request);
    const gems = Number.parseInt(request.data?.gems, 10);
    const currency = String(request.data?.currency || '').toLowerCase();

    if (!Number.isFinite(gems) || gems < PAYOUT_MIN_GEMS) {
      throw new functions.https.HttpsError('invalid-argument', `Minimum withdrawal is ${PAYOUT_MIN_GEMS} gems`);
    }
    if (!currency) {
      throw new functions.https.HttpsError('invalid-argument', 'currency required');
    }

    const walletSnap = await db.collection('wallets').doc(uid).get();
    if (!walletSnap.exists || (walletSnap.data().gems || 0) < gems) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient gems');
    }

    // 1 gem = €0.01. Apply 2% platform spread.
    const eurValue = gems * 0.01;
    const spreadEUR = +(eurValue * PAYOUT_SPREAD_PCT).toFixed(4);
    const eurAfterSpread = +(eurValue - spreadEUR).toFixed(4);

    let cryptoAmount, networkFee;
    try {
      const np = npClient(NOWPAYMENTS_API_KEY.value());
      // NOWPayments converts EUR → USDT internally. We quote the user in their
      // chosen currency; conversion happens at NOWPayments' side at fixed rate.
      const est = await np.get('/estimate', {
        params: {
          amount: eurAfterSpread,
          currency_from: 'eur',
          currency_to: currency,
        },
      });
      cryptoAmount = est.data.estimated_amount;

      // Network fee in the same currency
      const fee = await np.get('/payout/fee', {
        params: { currency, amount: cryptoAmount },
      }).catch(() => ({ data: { fee: 0 } }));
      networkFee = fee.data.fee || 0;
    } catch (err) {
      console.error('NP estimate failed', err.response?.data || err.message);
      throw new functions.https.HttpsError('internal', 'Could not fetch live rate — try again');
    }

    const quoteRef = db.collection('payout_quotes').doc();
    const lockedUntil = Date.now() + QUOTE_TTL_MS;
    await quoteRef.set({
      userId: uid,
      gems,
      currency,
      cryptoAmount: Number(cryptoAmount),
      networkFee: Number(networkFee),
      eurValue, spreadEUR, eurAfterSpread,
      lockedUntil,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      quoteId: quoteRef.id,
      gems,
      currency,
      cryptoAmount: Number(cryptoAmount),
      networkFee: Number(networkFee),
      eurValue,
      spreadEUR,
      eurAfterSpread,
      lockedUntil,
    };
  }
);

// ════════════════════════════════════════════════════════════════════
// 4. confirmPayout — user confirms quote, we send via NOWPayments
// ════════════════════════════════════════════════════════════════════
// Input:  { quoteId, walletAddress, totp? }
// Output: { payoutId, status }
//
// Atomically: validates quote, debits gems, creates payout doc, calls
// NOWPayments. If gems > €500 worth, mark as `awaiting_approval` and skip
// the NOWPayments call (admin reviews manually).

exports.confirmPayout = functions.https.onCall(
  { region: REGION, secrets: [NOWPAYMENTS_API_KEY, NOWPAYMENTS_2FA_KEY], cors: true },
  async (request) => {
    const uid = requireAuth(request);
    const { quoteId, walletAddress } = request.data || {};
    if (!quoteId || !walletAddress) {
      throw new functions.https.HttpsError('invalid-argument', 'quoteId and walletAddress required');
    }

    const quoteRef = db.collection('payout_quotes').doc(quoteId);
    const quoteSnap = await quoteRef.get();
    if (!quoteSnap.exists) throw new functions.https.HttpsError('not-found', 'Quote not found');
    const quote = quoteSnap.data();
    if (quote.userId !== uid) throw new functions.https.HttpsError('permission-denied', 'Not your quote');
    if (quote.lockedUntil < Date.now()) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Quote expired — refresh and try again');
    }
    if (quote.consumed) {
      throw new functions.https.HttpsError('already-exists', 'Quote already used');
    }

    // Atomic gem debit + payout doc creation
    const payoutRef = db.collection('payouts').doc();
    const requiresApproval = quote.eurAfterSpread > SMALL_PAYOUT_AUTO_APPROVE_EUR;

    await db.runTransaction(async (tx) => {
      // Rate-limit + daily-cap check (1 payout/min, €1,000/day across all currencies)
      await checkRateLimit(tx, uid, 'payout', {
        perHour: 5,
        perDay:  10,
        sumField: 'eurValue',
        sumLimit: PAYOUT_DAILY_CAP_EUR,
        sumValue: quote.eurAfterSpread,
      });

      const walletRef = db.collection('wallets').doc(uid);
      const walletSnap = await tx.get(walletRef);
      if (!walletSnap.exists) throw new functions.https.HttpsError('failed-precondition', 'Wallet not found');
      const w = walletSnap.data();
      if ((w.gems || 0) < quote.gems) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient gems');
      }
      tx.update(walletRef, {
        gems: FieldValue.increment(-quote.gems),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(payoutRef, {
        userId: uid,
        gems: quote.gems,
        currency: quote.currency,
        cryptoAmount: quote.cryptoAmount,
        networkFee: quote.networkFee,
        eurValue: quote.eurValue,
        spreadEUR: quote.spreadEUR,
        eurAfterSpread: quote.eurAfterSpread,
        payoutAddress: walletAddress,
        status: requiresApproval ? 'awaiting_approval' : 'pending',
        quoteId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(quoteRef, { consumed: true, payoutDocId: payoutRef.id });
      tx.set(db.collection('transactions').doc(), {
        userId: uid, type: 'payout_request',
        amount: -quote.gems, currency: 'gems',
        description: `Withdrawal: ${quote.cryptoAmount} ${quote.currency.toUpperCase()} → ${walletAddress.slice(0, 8)}…`,
        meta: { payoutId: payoutRef.id, currency: quote.currency, eurValue: quote.eurAfterSpread },
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // For amounts that need approval, stop here — admin will trigger send later.
    if (requiresApproval) {
      return { payoutId: payoutRef.id, status: 'awaiting_approval' };
    }

    // Send via NOWPayments mass-payout endpoint. Requires 2FA TOTP code.
    let payoutResp;
    try {
      const np = npClient(NOWPAYMENTS_API_KEY.value());
      // Step 1: create the payout
      const create = await np.post('/payout', {
        ipn_callback_url: `https://${REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/nowpaymentsIpn`,
        withdrawals: [{
          address: walletAddress,
          currency: quote.currency,
          amount: quote.cryptoAmount,
          ipn_callback_url: `https://${REGION}-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/nowpaymentsIpn`,
        }],
      });
      const batchId = create.data.id;

      // Step 2: verify with TOTP code generated from the platform 2FA secret
      let totpCode;
      if (speakeasy && NOWPAYMENTS_2FA_KEY.value()) {
        totpCode = speakeasy.totp({ secret: NOWPAYMENTS_2FA_KEY.value(), encoding: 'base32' });
      }
      if (!totpCode) {
        throw new Error('TOTP code unavailable — install `speakeasy` in functions/package.json and set NOWPAYMENTS_2FA_KEY');
      }
      await np.post(`/payout/${batchId}/verify`, { verification_code: totpCode });

      payoutResp = create.data;
      await payoutRef.update({
        nowpaymentsBatchId: batchId,
        nowpaymentsId: String(payoutResp.withdrawals?.[0]?.id || batchId),
        status: 'sending',
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error('NP payout failed', err.response?.data || err.message);
      // Refund gems
      await db.runTransaction(async (tx) => {
        tx.update(db.collection('wallets').doc(uid), {
          gems: FieldValue.increment(quote.gems),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(payoutRef, {
          status: 'failed',
          failureReason: err.response?.data?.message || err.message,
          refundedAt: FieldValue.serverTimestamp(),
        });
        tx.set(db.collection('transactions').doc(), {
          userId: uid, type: 'payout_refunded',
          amount: quote.gems, currency: 'gems',
          description: 'Withdrawal failed — gems re-credited',
          meta: { payoutId: payoutRef.id }, createdAt: FieldValue.serverTimestamp(),
        });
      });
      throw new functions.https.HttpsError('internal', 'Withdrawal failed — gems refunded');
    }

    return { payoutId: payoutRef.id, status: 'sending' };
  }
);

// ════════════════════════════════════════════════════════════════════
// 5. listPayoutCurrencies — cached list of supported currencies + minimums
// ════════════════════════════════════════════════════════════════════

exports.listPayoutCurrencies = functions.https.onCall(
  { region: REGION, secrets: [NOWPAYMENTS_API_KEY], cors: true },
  async (request) => {
    requireAuth(request);
    // 5-minute cache
    const cacheRef = db.collection('cache').doc('np_currencies');
    const cached = await cacheRef.get();
    if (cached.exists && Date.now() - (cached.data().fetchedAt || 0) < 5 * 60_000) {
      return cached.data().payload;
    }
    const np = npClient(NOWPAYMENTS_API_KEY.value());
    const resp = await np.get('/full-currencies').catch(() => ({ data: { currencies: [] } }));
    const filtered = (resp.data.currencies || resp.data || [])
      .filter(c => c.enable && c.payout_enabled !== false)
      .map(c => ({
        code: c.code,
        name: c.name,
        network: c.network,
        logoUrl: c.logo_url || null,
        minPayout: c.min_payout || c.min_amount || null,
      }));
    const payload = { currencies: filtered };
    await cacheRef.set({ payload, fetchedAt: Date.now() });
    return payload;
  }
);
