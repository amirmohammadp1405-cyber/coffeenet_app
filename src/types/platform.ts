export type CafeStatus = 'unknown' | 'open' | 'closed' | 'busy';

export type WeekdayKey =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export type DailyShift = {
  open: string;
  close: string;
};

export type DailyHours = {
  shifts?: DailyShift[];
  open?: string;
  close?: string;
  closed?: boolean;
};

export type WeeklyHours = Partial<Record<WeekdayKey, DailyHours>>;

export type PriceItem = {
  label: string;
  amount: number;
};

export type ServiceFormInputType =
  | 'text'
  | 'number'
  | 'phone'
  | 'email'
  | 'textarea'
  | 'nationalId'
  | 'postalCode';

export type UserProfileField =
  | 'name'
  | 'nationalId'
  | 'postalCode'
  | 'address'
  | 'phone'
  | 'birthDate'
  | 'province'
  | 'city';

export type ServiceFormValidationMessages = Partial<
  Record<'required' | 'invalid' | 'minLength' | 'maxLength' | 'min' | 'max', string>
>;

export type ServiceFormField = {
  key: string;
  label: string;
  type:
    | ServiceFormInputType
    | 'select'
    | 'checkbox'
    | 'image'
    | 'file'
    | 'date'
    | 'time'
    | 'location';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  minLength?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  profileField?: UserProfileField;
  validationMessages?: ServiceFormValidationMessages;
  mimeTypes?: string[];
};

export type ServiceAvailability = {
  days?: string[];
  start?: string;
  end?: string;
  note?: string;
};

export type Service = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  cardImageUrl: string | null;
  detailImageUrl: string | null;
  basePrice: number;
  priceBreakdown: PriceItem[];
  processingMinutes: number;
  availability: ServiceAvailability;
  formSchema: ServiceFormField[];
};

export type ServiceCategory = {
  id: string;
  title: string;
  services: Service[];
};

export type CafeStatusInfo = {
  status: CafeStatus;
  notice: string;
  estimatedWaitMinutes: number | null;
  weeklyHours: WeeklyHours;
};

export type AppSettings = {
  aboutText: string;
  instagramUrl: string;
  telegramUrl: string;
  whatsappUrl: string;
};

export type Announcement = {
  id: string;
  title: string;
  description: string;
  backgroundType: 'color' | 'image';
  backgroundColor: string;
  backgroundTexture: 'none' | 'dots' | 'stripes';
  imageUrl: string | null;
  link: string | null;
};

export type ServiceAnnouncement = {
  id: string;
  serviceId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
};

export type AppVersion = {
  id: string;
  version: string;
  description: string;
  link: string;
};

export type OrderStatus =
  | 'awaiting_operator'
  | 'awaiting_payment'
  | 'payment_review'
  | 'in_progress'
  | 'awaiting_customer'
  | 'completed'
  | 'cancelled';

export type OrderType = 'service' | 'free';

export type Order = {
  id: string;
  orderNumber: string;
  orderType?: OrderType;
  serviceId: string;
  serviceTitle: string;
  formData: Record<string, unknown>;
  formLabels: Record<string, string>;
  operatorFormSchema?: ServiceFormField[];
  operatorFormData?: Record<string, unknown>;
  operatorFormSubmitted?: boolean;
  assignedOperator?: string;
  paymentInstructions?: PaymentInstructions | null;
  priceBreakdown: PriceItem[];
  totalAmount: number;
  processingMinutes: number;
  status: OrderStatus;
  statusNote: string;
  created: string;
  updated: string;
};

export type OrderMessage = {
  id: string;
  orderId: string;
  sender: 'guest' | 'operator';
  body: string;
  attachmentUrl: string | null;
  created: string;
};

export type OrderAttachment = {
  id: string;
  fieldKey: string;
  fileUrl: string;
  created: string;
};

export type PaymentInstructions = {
  available: boolean;
  bankName: string;
  cardHolder: string;
  cardNumber: string;
  accountNumber: string;
  paymentNote: string;
};

export type LocationValue = {
  latitude: number;
  longitude: number;
  address?: string;
};
