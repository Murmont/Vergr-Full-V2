import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import { db } from "./db";

/**
 * Create an order from the user's cart.
 * Validates stock, calculates totals, creates order document.
 */
export const createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const userId = context.auth.uid;
  const { shippingAddress, paymentMethod, useCoins, coinAmount } = data;

  if (!shippingAddress) {
    throw new functions.https.HttpsError("invalid-argument", "Shipping address required");
  }

  // Get cart items
  const cartItems = await db.collection("carts").doc(userId).collection("items").get();
  if (cartItems.empty) {
    throw new functions.https.HttpsError("failed-precondition", "Cart is empty");
  }

  return db.runTransaction(async (tx) => {
    let subtotalEUR = 0;
    const orderItems: any[] = [];

    // Validate each cart item against product stock
    for (const cartDoc of cartItems.docs) {
      const cartItem = cartDoc.data();
      const productRef = db.collection("products").doc(cartItem.productId);
      const product = await tx.get(productRef);

      if (!product.exists || !product.data()!.active) {
        throw new functions.https.HttpsError("not-found", `Product ${cartItem.productId} is no longer available`);
      }

      const p = product.data()!;
      if (p.stock < cartItem.quantity) {
        throw new functions.https.HttpsError("failed-precondition", `Insufficient stock for ${p.name}`);
      }

      const itemTotal = p.priceEUR * cartItem.quantity;
      subtotalEUR += itemTotal;

      orderItems.push({
        productId: cartItem.productId,
        name: p.name,
        priceEUR: p.priceEUR,
        quantity: cartItem.quantity,
        totalEUR: itemTotal,
        image: p.images?.[0] || null,
      });

      // Decrement stock
      tx.update(productRef, {
        stock: admin.firestore.FieldValue.increment(-cartItem.quantity),
        soldCount: admin.firestore.FieldValue.increment(cartItem.quantity),
      });
    }

    // Calculate totals
    const shippingEUR = subtotalEUR >= 500 ? 0 : 4.99; // Free shipping over €25
    const vatRate = 0.15; // South Africa VAT
    const vatEUR = Math.round(subtotalEUR * vatRate * 100) / 100;

    // Coin discount (if applicable)
    let coinDiscount = 0;
    if (useCoins && coinAmount > 0) {
      const walletRef = db.collection("wallets").doc(userId);
      const wallet = await tx.get(walletRef);
      const balance = wallet.data()?.balance || 0;

      const maxCoinsUsable = Math.min(coinAmount, balance, subtotalEUR * 10); // 10 coins = R1
      coinDiscount = maxCoinsUsable / 10; // Convert to EUR

      tx.update(walletRef, {
        balance: admin.firestore.FieldValue.increment(-maxCoinsUsable),
        totalSpent: admin.firestore.FieldValue.increment(maxCoinsUsable),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const totalEUR = subtotalEUR + shippingEUR + vatEUR - coinDiscount;

    // Create order
    const orderRef = db.collection("orders").doc();
    tx.set(orderRef, {
      userId,
      status: "pending_payment", // pending_payment | paid | processing | shipped | delivered | cancelled | refunded
      items: orderItems,
      itemCount: orderItems.length,
      subtotalEUR,
      shippingEUR,
      vatEUR,
      coinDiscount,
      totalEUR: Math.max(0, totalEUR),
      shippingAddress,
      paymentMethod,
      trackingNumber: null,
      trackingUrl: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Clear cart
    for (const cartDoc of cartItems.docs) {
      tx.delete(cartDoc.ref);
    }

    return {
      orderId: orderRef.id,
      totalEUR: Math.max(0, totalEUR),
      itemCount: orderItems.length,
    };
  });
});

/**
 * Handle Stripe webhook events.
 * Processes payment confirmations, refunds, etc.
 */
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  // TODO: Verify Stripe webhook signature
  // const sig = req.headers['stripe-signature'];
  // const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);

  const event = req.body;

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const orderId = intent.metadata?.orderId;
        if (orderId) {
          await db.collection("orders").doc(orderId).update({
            status: "paid",
            paymentIntentId: intent.id,
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Notify user
          const order = await db.collection("orders").doc(orderId).get();
          if (order.exists) {
            await db.collection("notifications").add({
              recipientId: order.data()!.userId,
              type: "order",
              title: "Payment confirmed!",
              body: `Your order #${orderId.substring(0, 8)} is being processed`,
              data: { orderId },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const orderId = charge.metadata?.orderId;
        if (orderId) {
          await db.collection("orders").doc(orderId).update({
            status: "refunded",
            refundedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }

      default:
        functions.logger.info(`Unhandled Stripe event: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    functions.logger.error("Stripe webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Request a creator payout via Stripe Connect.
 */
export const requestPayout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const userId = context.auth.uid;

  // Check if user is a creator
  const creator = await db.collection("creators").doc(userId).get();
  if (!creator.exists) {
    throw new functions.https.HttpsError("failed-precondition", "Not a registered creator");
  }

  // Check wallet balance
  const wallet = await db.collection("wallets").doc(userId).get();
  const balance = wallet.data()?.balance || 0;

  const minPayout = 1000; // Minimum 1000 coins to cash out
  if (balance < minPayout) {
    throw new functions.https.HttpsError("failed-precondition", `Minimum payout is ${minPayout} coins`);
  }

  // Coin to EUR conversion: 100 coins = R10
  const payoutCoins = data.amount || balance;
  const payoutEUR = payoutCoins / 10;

  // TODO: Create Stripe Connect transfer
  // const transfer = await stripe.transfers.create({
  //   amount: Math.floor(payoutEUR * 100), // cents
  //   currency: 'eur',
  //   destination: creator.data()!.stripeConnectId,
  // });

  // Record payout request
  const payout = await db.collection("creators").doc(userId).collection("payouts").add({
    amount: payoutCoins,
    amountEUR: payoutEUR,
    status: "pending", // pending | processing | completed | failed
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { payoutId: payout.id, amountEUR: payoutEUR };
});
