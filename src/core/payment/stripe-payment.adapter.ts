import Stripe from "stripe";
import {
  IPaymentGateway,
  PaymentIntentResult,
} from "./payment-gateway.interface";
import { getEnv } from "../config/env";
import { AppError } from "../errors/app-error";

export class StripePaymentAdapter implements IPaymentGateway {
  private stripeClient: Stripe | null = null;

  constructor(stripeApiKey?: string) {
    if (stripeApiKey) {
      this.stripeClient = new Stripe(stripeApiKey);
    }
  }

  private getStripeClient(): Stripe {
    if (this.stripeClient) {
      return this.stripeClient;
    }

    try {
      const env = getEnv();
      if (!env.STRIPE_SECRET_KEY) {
        throw new AppError(
          "Stripe secret key (STRIPE_SECRET_KEY) is not configured in environment variables",
          500
        );
      }
      this.stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
      return this.stripeClient;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to initialize Stripe client: ${error?.message || "Unknown error"}`,
        500
      );
    }
  }

  async createPaymentIntent(
    amountInCents: number,
    currency = "usd"
  ): Promise<PaymentIntentResult> {
    const stripe = this.getStripeClient();

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency,
        payment_method_types: ["card"],
      });

      if (!paymentIntent.client_secret) {
        throw new AppError(
          "Stripe failed to return a client secret for payment intent",
          500
        );
      }

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Stripe payment intent generation failed: ${error?.message || "Unknown error"}`,
        500
      );
    }
  }
}

export const stripePaymentAdapter = new StripePaymentAdapter();
