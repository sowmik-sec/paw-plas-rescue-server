import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakePaymentAdapter } from "../../src/core/payment/fake-payment.adapter";
import { StripePaymentAdapter } from "../../src/core/payment/stripe-payment.adapter";
import { AppError } from "../../src/core/errors/app-error";

describe("Payment Gateway Seam", () => {
  describe("FakePaymentAdapter", () => {
    let fakeAdapter: FakePaymentAdapter;

    beforeEach(() => {
      fakeAdapter = new FakePaymentAdapter();
    });

    it("generates deterministic client secret and id for valid amount in cents", async () => {
      const result = await fakeAdapter.createPaymentIntent(2500, "usd");

      expect(result.clientSecret).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.clientSecret).toContain(result.id!);

      const recorded = fakeAdapter.getIntents();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].amountInCents).toBe(2500);
      expect(recorded[0].currency).toBe("usd");
      expect(recorded[0].clientSecret).toBe(result.clientSecret);
    });

    it("clears recorded intents upon reset", async () => {
      await fakeAdapter.createPaymentIntent(5000);
      expect(fakeAdapter.getIntents()).toHaveLength(1);

      fakeAdapter.clear();
      expect(fakeAdapter.getIntents()).toHaveLength(0);
    });
  });

  describe("StripePaymentAdapter", () => {
    it("throws AppError if Stripe API key is not configured in env", async () => {
      const adapter = new StripePaymentAdapter();
      // Without env.STRIPE_SECRET_KEY, createPaymentIntent should throw AppError
      await expect(adapter.createPaymentIntent(1000)).rejects.toThrow(AppError);
    });

    it("calls Stripe SDK when initialized with custom key", async () => {
      const adapter = new StripePaymentAdapter("sk_test_mock_key_123");
      // Mock the internal stripeClient
      const mockStripe = (adapter as any).stripeClient;
      mockStripe.paymentIntents = {
        create: vi.fn().mockResolvedValue({
          id: "pi_12345",
          client_secret: "pi_12345_secret_abc",
        }),
      };

      const result = await adapter.createPaymentIntent(3000, "usd");

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 3000,
        currency: "usd",
        payment_method_types: ["card"],
      });
      expect(result.clientSecret).toBe("pi_12345_secret_abc");
      expect(result.id).toBe("pi_12345");
    });
  });
});
