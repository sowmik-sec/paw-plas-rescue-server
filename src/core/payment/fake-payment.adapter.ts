import {
  IPaymentGateway,
  PaymentIntentResult,
} from "./payment-gateway.interface";

export interface FakePaymentIntentRecord {
  amountInCents: number;
  currency: string;
  clientSecret: string;
  id: string;
  createdAt: Date;
}

export class FakePaymentAdapter implements IPaymentGateway {
  public intents: FakePaymentIntentRecord[] = [];
  private counter = 0;

  async createPaymentIntent(
    amountInCents: number,
    currency = "usd"
  ): Promise<PaymentIntentResult> {
    this.counter += 1;
    const id = `pi_fake_${Date.now()}_${this.counter}`;
    const clientSecret = `${id}_secret_${Math.random().toString(36).substring(2, 10)}`;

    const record: FakePaymentIntentRecord = {
      amountInCents,
      currency,
      clientSecret,
      id,
      createdAt: new Date(),
    };

    this.intents.push(record);

    return {
      clientSecret,
      id,
    };
  }

  getIntents(): FakePaymentIntentRecord[] {
    return [...this.intents];
  }

  clear(): void {
    this.intents = [];
    this.counter = 0;
  }
}

export const fakePaymentAdapter = new FakePaymentAdapter();
