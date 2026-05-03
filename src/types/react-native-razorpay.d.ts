declare module 'react-native-razorpay' {
  export interface RazorpayCheckoutOptions {
    key: string;
    subscription_id?: string;
    amount?: number | string;
    currency?: string;
    name?: string;
    description?: string;
    image?: string;
    recurring?: boolean;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    notes?: Record<string, string>;
    theme?: {
      color?: string;
    };
  }

  export interface RazorpayCheckoutSuccess {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayCheckoutFailure {
    code?: string | number;
    description?: string;
    reason?: string;
  }

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayCheckoutSuccess>;
  };

  export default RazorpayCheckout;
}
