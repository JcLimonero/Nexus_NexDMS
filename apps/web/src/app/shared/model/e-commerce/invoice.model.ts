import { ICartItem } from "./cart.model";

export interface IInvoice {
  shippingDetails?: ShippingDetails;
  product?: ICartItem[];
  totalAmount?: number;
}

export interface ShippingDetails {
  firstName: string;
  email: string;
  phone: string;
  userInfo?: string;
}
