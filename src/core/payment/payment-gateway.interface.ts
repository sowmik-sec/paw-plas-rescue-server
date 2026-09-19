export interface PaymentIntentResult {
  clientSecret: string;
  id?: string;
}

export interface IPaymentGateway {
  /**
   * Securely generates a payment intent with the provider and returns the client secret.
   * @param amountInCents The amount to charge in the smallest currency unit (cents for USD).
   * @param currency The three-letter ISO currency code (default: 'usd').
   */
  createPaymentIntent(
    amountInCents: number,
    currency?: string
  ): Promise<PaymentIntentResult>;
}
