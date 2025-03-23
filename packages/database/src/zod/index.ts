import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt','updatedAt','username','role','banned','banReason','banExpires','onboardingComplete','paymentsCustomerId','locale']);

export const SessionScalarFieldEnumSchema = z.enum(['id','expiresAt','ipAddress','userAgent','userId','impersonatedBy','activeOrganizationId','token','createdAt','updatedAt']);

export const AccountScalarFieldEnumSchema = z.enum(['id','accountId','providerId','userId','accessToken','refreshToken','idToken','expiresAt','password','accessTokenExpiresAt','refreshTokenExpiresAt','scope','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','identifier','value','expiresAt','createdAt','updatedAt']);

export const PasskeyScalarFieldEnumSchema = z.enum(['id','name','publicKey','userId','credentialID','counter','deviceType','backedUp','transports','createdAt']);

export const OrganizationScalarFieldEnumSchema = z.enum(['id','name','slug','logo','createdAt','metadata','paymentsCustomerId']);

export const MemberScalarFieldEnumSchema = z.enum(['id','organizationId','userId','role','createdAt']);

export const InvitationScalarFieldEnumSchema = z.enum(['id','organizationId','email','role','status','expiresAt','inviterId','createdAt']);

export const PurchaseScalarFieldEnumSchema = z.enum(['id','organizationId','userId','type','customerId','subscriptionId','productId','status','createdAt','updatedAt']);

export const AiChatScalarFieldEnumSchema = z.enum(['id','organizationId','userId','title','messages','createdAt','updatedAt']);

export const OutletScalarFieldEnumSchema = z.enum(['id','organizationId','name','location','phone','email','address','city','state','zipCode','country','isMain','notes','createdAt','updatedAt']);

export const SaleScalarFieldEnumSchema = z.enum(['id','organizationId','outletId','userId','customerId','totalAmount','status','createdAt','updatedAt']);

export const SaleItemScalarFieldEnumSchema = z.enum(['id','saleId','productId','quantity','unitPrice','totalPrice','createdAt','updatedAt']);

export const ProductScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','categoryId','brandId','unitId','rackId','price','createdAt','updatedAt']);

export const CategoryScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const RackScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const UnitScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const VariationScalarFieldEnumSchema = z.enum(['id','productId','attributeId','value','createdAt','updatedAt']);

export const AttributeScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const BrandScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const InventoryScalarFieldEnumSchema = z.enum(['id','organizationId','outletId','productId','quantity','createdAt','updatedAt']);

export const CustomerScalarFieldEnumSchema = z.enum(['id','organizationId','name','email','phone','address','groupId','createdAt','updatedAt']);

export const CustomerGroupScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const PromotionScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','discount','startDate','endDate','createdAt','updatedAt']);

export const DeliveryPartnerScalarFieldEnumSchema = z.enum(['id','organizationId','name','code','contactPerson','email','phone','website','address','logo','status','supportedMethods','trackingUrlTemplate','apiEndpoint','apiKey','apiSecret','notes','serviceAreas','settings','customFields','createdById','updatedById','createdAt','updatedAt']);

export const ShippingRateScalarFieldEnumSchema = z.enum(['id','deliveryPartnerId','organizationId','name','method','baseRate','perKgRate','minWeight','maxWeight','fromLocation','toLocation','estimatedDeliveryDays','isActive','conditions','createdById','updatedById','createdAt','updatedAt']);

export const ShipmentScalarFieldEnumSchema = z.enum(['id','organizationId','deliveryPartnerId','trackingNumber','status','fromAddress','toAddress','weight','dimensions','shippingMethod','shippingCost','estimatedDelivery','actualDelivery','notes','trackingHistory','createdById','updatedById','createdAt','updatedAt']);

export const PurchaseOrgScalarFieldEnumSchema = z.enum(['id','organizationId','supplierId','totalAmount','status','createdAt','updatedAt']);

export const PurchaseItemScalarFieldEnumSchema = z.enum(['id','purchaseId','productId','quantity','unitPrice','totalPrice','createdAt','updatedAt']);

export const SupplierScalarFieldEnumSchema = z.enum(['id','organizationId','name','contact','address','createdAt','updatedAt']);

export const CustomerReceiveScalarFieldEnumSchema = z.enum(['id','organizationId','customerId','amount','createdAt','updatedAt']);

export const SupplierPaymentScalarFieldEnumSchema = z.enum(['id','organizationId','supplierId','amount','createdAt','updatedAt']);

export const AccountOrgScalarFieldEnumSchema = z.enum(['id','organizationId','name','type','balance','createdAt','updatedAt']);

export const TransactionScalarFieldEnumSchema = z.enum(['id','organizationId','accountId','type','amount','createdAt','updatedAt']);

export const AttendanceScalarFieldEnumSchema = z.enum(['id','organizationId','employeeId','date','status','checkInTime','checkOutTime','workHours','leaveType','notes','locationCheckIn','locationCheckOut','photoCheckIn','photoCheckOut','isManualEntry','createdById','updatedById','createdAt','updatedAt']);

export const LeaveRequestScalarFieldEnumSchema = z.enum(['id','organizationId','employeeId','startDate','endDate','leaveType','reason','contactInfo','isHalfDay','numberOfDays','status','notes','documents','approvedDays','approvedById','approvedAt','createdById','createdAt','updatedAt']);

export const EmployeeScalarFieldEnumSchema = z.enum(['id','organizationId','userId','roleId','createdAt','updatedAt']);

export const RoleScalarFieldEnumSchema = z.enum(['id','organizationId','name','permissions','createdAt','updatedAt']);

export const ExpenseScalarFieldEnumSchema = z.enum(['id','organizationId','categoryId','amount','description','createdAt','updatedAt']);

export const ExpenseCategoryScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const IncomeScalarFieldEnumSchema = z.enum(['id','organizationId','itemId','amount','description','createdAt','updatedAt']);

export const IncomeItemScalarFieldEnumSchema = z.enum(['id','organizationId','name','createdAt','updatedAt']);

export const SaleReturnScalarFieldEnumSchema = z.enum(['id','organizationId','saleId','reason','amount','createdAt','updatedAt']);

export const PurchaseReturnScalarFieldEnumSchema = z.enum(['id','organizationId','purchaseId','reason','amount','createdAt','updatedAt']);

export const SettingScalarFieldEnumSchema = z.enum(['id','organizationId','key','value','createdAt','updatedAt']);

export const InstallmentScalarFieldEnumSchema = z.enum(['id','organizationId','customerId','saleId','totalAmount','paidAmount','dueDate','createdAt','updatedAt']);

export const WarrantyScalarFieldEnumSchema = z.enum(['id','organizationId','productId','duration','startDate','endDate','createdAt','updatedAt']);

export const PayrollScalarFieldEnumSchema = z.enum(['id','organizationId','employeeId','amount','period','createdAt','updatedAt']);

export const FixedAssetScalarFieldEnumSchema = z.enum(['id','organizationId','name','purchaseDate','value','createdAt','updatedAt']);

export const BookingScalarFieldEnumSchema = z.enum(['id','organizationId','customerId','date','status','createdAt','updatedAt']);

export const QuotationScalarFieldEnumSchema = z.enum(['id','organizationId','customerId','totalAmount','status','createdAt','updatedAt']);

export const TransferScalarFieldEnumSchema = z.enum(['id','organizationId','fromOutletId','toOutletId','productId','quantity','createdAt','updatedAt']);

export const DamageScalarFieldEnumSchema = z.enum(['id','organizationId','productId','quantity','reason','createdAt','updatedAt']);

export const PurchaseOrderScalarFieldEnumSchema = z.enum(['id','poNumber','organizationId','supplierId','status','orderDate','expectedDeliveryDate','totalAmount','notes','createdAt','updatedAt']);

export const PurchaseOrderItemScalarFieldEnumSchema = z.enum(['id','purchaseOrderId','productId','quantity','unitPrice','createdAt','updatedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const PurchaseTypeSchema = z.enum(['SUBSCRIPTION','ONE_TIME']);

export type PurchaseTypeType = `${z.infer<typeof PurchaseTypeSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  username: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
  onboardingComplete: z.boolean(),
  paymentsCustomerId: z.string().nullable(),
  locale: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
  impersonatedBy: z.string().nullable(),
  activeOrganizationId: z.string().nullable(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  password: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// VERIFICATION SCHEMA
/////////////////////////////////////////

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Verification = z.infer<typeof VerificationSchema>

/////////////////////////////////////////
// PASSKEY SCHEMA
/////////////////////////////////////////

export const PasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  publicKey: z.string(),
  userId: z.string(),
  credentialID: z.string(),
  counter: z.number().int(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
})

export type Passkey = z.infer<typeof PasskeySchema>

/////////////////////////////////////////
// ORGANIZATION SCHEMA
/////////////////////////////////////////

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  logo: z.string().nullable(),
  createdAt: z.coerce.date(),
  metadata: z.string().nullable(),
  paymentsCustomerId: z.string().nullable(),
})

export type Organization = z.infer<typeof OrganizationSchema>

/////////////////////////////////////////
// MEMBER SCHEMA
/////////////////////////////////////////

export const MemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
})

export type Member = z.infer<typeof MemberSchema>

/////////////////////////////////////////
// INVITATION SCHEMA
/////////////////////////////////////////

export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  status: z.string(),
  expiresAt: z.coerce.date(),
  inviterId: z.string(),
  createdAt: z.coerce.date(),
})

export type Invitation = z.infer<typeof InvitationSchema>

/////////////////////////////////////////
// PURCHASE SCHEMA
/////////////////////////////////////////

export const PurchaseSchema = z.object({
  type: PurchaseTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  customerId: z.string(),
  subscriptionId: z.string().nullable(),
  productId: z.string(),
  status: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Purchase = z.infer<typeof PurchaseSchema>

/////////////////////////////////////////
// AI CHAT SCHEMA
/////////////////////////////////////////

export const AiChatSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  title: z.string().nullable(),
  messages: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AiChat = z.infer<typeof AiChatSchema>

/////////////////////////////////////////
// OUTLET SCHEMA
/////////////////////////////////////////

export const OutletSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  name: z.string(),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable(),
  isMain: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Outlet = z.infer<typeof OutletSchema>

/////////////////////////////////////////
// SALE SCHEMA
/////////////////////////////////////////

export const SaleSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  outletId: z.string(),
  userId: z.string(),
  customerId: z.string().nullable(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Sale = z.infer<typeof SaleSchema>

/////////////////////////////////////////
// SALE ITEM SCHEMA
/////////////////////////////////////////

export const SaleItemSchema = z.object({
  id: z.string().cuid(),
  saleId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SaleItem = z.infer<typeof SaleItemSchema>

/////////////////////////////////////////
// PRODUCT SCHEMA
/////////////////////////////////////////

export const ProductSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string().nullable(),
  brandId: z.string().nullable(),
  unitId: z.string().nullable(),
  rackId: z.string().nullable(),
  price: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Product = z.infer<typeof ProductSchema>

/////////////////////////////////////////
// CATEGORY SCHEMA
/////////////////////////////////////////

export const CategorySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Category = z.infer<typeof CategorySchema>

/////////////////////////////////////////
// RACK SCHEMA
/////////////////////////////////////////

export const RackSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Rack = z.infer<typeof RackSchema>

/////////////////////////////////////////
// UNIT SCHEMA
/////////////////////////////////////////

export const UnitSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Unit = z.infer<typeof UnitSchema>

/////////////////////////////////////////
// VARIATION SCHEMA
/////////////////////////////////////////

export const VariationSchema = z.object({
  id: z.string().cuid(),
  productId: z.string(),
  attributeId: z.string(),
  value: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Variation = z.infer<typeof VariationSchema>

/////////////////////////////////////////
// ATTRIBUTE SCHEMA
/////////////////////////////////////////

export const AttributeSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Attribute = z.infer<typeof AttributeSchema>

/////////////////////////////////////////
// BRAND SCHEMA
/////////////////////////////////////////

export const BrandSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Brand = z.infer<typeof BrandSchema>

/////////////////////////////////////////
// INVENTORY SCHEMA
/////////////////////////////////////////

export const InventorySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  outletId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Inventory = z.infer<typeof InventorySchema>

/////////////////////////////////////////
// CUSTOMER SCHEMA
/////////////////////////////////////////

export const CustomerSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  groupId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Customer = z.infer<typeof CustomerSchema>

/////////////////////////////////////////
// CUSTOMER GROUP SCHEMA
/////////////////////////////////////////

export const CustomerGroupSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CustomerGroup = z.infer<typeof CustomerGroupSchema>

/////////////////////////////////////////
// PROMOTION SCHEMA
/////////////////////////////////////////

export const PromotionSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  discount: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Promotion = z.infer<typeof PromotionSchema>

/////////////////////////////////////////
// DELIVERY PARTNER SCHEMA
/////////////////////////////////////////

export const DeliveryPartnerSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  contactPerson: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  logo: z.string().nullable(),
  status: z.string(),
  supportedMethods: z.string().array(),
  trackingUrlTemplate: z.string().nullable(),
  apiEndpoint: z.string().nullable(),
  apiKey: z.string().nullable(),
  apiSecret: z.string().nullable(),
  notes: z.string().nullable(),
  serviceAreas: z.string().array(),
  settings: JsonValueSchema.nullable(),
  customFields: JsonValueSchema.nullable(),
  createdById: z.string().nullable(),
  updatedById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DeliveryPartner = z.infer<typeof DeliveryPartnerSchema>

/////////////////////////////////////////
// SHIPPING RATE SCHEMA
/////////////////////////////////////////

export const ShippingRateSchema = z.object({
  id: z.string().cuid(),
  deliveryPartnerId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  method: z.string(),
  baseRate: z.number(),
  perKgRate: z.number().nullable(),
  minWeight: z.number().nullable(),
  maxWeight: z.number().nullable(),
  fromLocation: z.string().nullable(),
  toLocation: z.string().nullable(),
  estimatedDeliveryDays: z.number().int().nullable(),
  isActive: z.boolean(),
  conditions: JsonValueSchema.nullable(),
  createdById: z.string().nullable(),
  updatedById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ShippingRate = z.infer<typeof ShippingRateSchema>

/////////////////////////////////////////
// SHIPMENT SCHEMA
/////////////////////////////////////////

export const ShipmentSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  deliveryPartnerId: z.string(),
  trackingNumber: z.string().nullable(),
  status: z.string(),
  fromAddress: z.string().nullable(),
  toAddress: z.string(),
  weight: z.number().nullable(),
  dimensions: JsonValueSchema.nullable(),
  shippingMethod: z.string().nullable(),
  shippingCost: z.number().nullable(),
  estimatedDelivery: z.coerce.date().nullable(),
  actualDelivery: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  trackingHistory: JsonValueSchema.nullable(),
  createdById: z.string().nullable(),
  updatedById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Shipment = z.infer<typeof ShipmentSchema>

/////////////////////////////////////////
// PURCHASE ORG SCHEMA
/////////////////////////////////////////

export const PurchaseOrgSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  supplierId: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PurchaseOrg = z.infer<typeof PurchaseOrgSchema>

/////////////////////////////////////////
// PURCHASE ITEM SCHEMA
/////////////////////////////////////////

export const PurchaseItemSchema = z.object({
  id: z.string().cuid(),
  purchaseId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PurchaseItem = z.infer<typeof PurchaseItemSchema>

/////////////////////////////////////////
// SUPPLIER SCHEMA
/////////////////////////////////////////

export const SupplierSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  contact: z.string().nullable(),
  address: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Supplier = z.infer<typeof SupplierSchema>

/////////////////////////////////////////
// CUSTOMER RECEIVE SCHEMA
/////////////////////////////////////////

export const CustomerReceiveSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  customerId: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CustomerReceive = z.infer<typeof CustomerReceiveSchema>

/////////////////////////////////////////
// SUPPLIER PAYMENT SCHEMA
/////////////////////////////////////////

export const SupplierPaymentSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  supplierId: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SupplierPayment = z.infer<typeof SupplierPaymentSchema>

/////////////////////////////////////////
// ACCOUNT ORG SCHEMA
/////////////////////////////////////////

export const AccountOrgSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  type: z.string(),
  balance: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AccountOrg = z.infer<typeof AccountOrgSchema>

/////////////////////////////////////////
// TRANSACTION SCHEMA
/////////////////////////////////////////

export const TransactionSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  accountId: z.string(),
  type: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Transaction = z.infer<typeof TransactionSchema>

/////////////////////////////////////////
// ATTENDANCE SCHEMA
/////////////////////////////////////////

export const AttendanceSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  employeeId: z.string(),
  date: z.coerce.date(),
  status: z.string(),
  checkInTime: z.string().nullable(),
  checkOutTime: z.string().nullable(),
  workHours: z.number().nullable(),
  leaveType: z.string().nullable(),
  notes: z.string().nullable(),
  locationCheckIn: z.string().nullable(),
  locationCheckOut: z.string().nullable(),
  photoCheckIn: z.string().nullable(),
  photoCheckOut: z.string().nullable(),
  isManualEntry: z.boolean(),
  createdById: z.string().nullable(),
  updatedById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Attendance = z.infer<typeof AttendanceSchema>

/////////////////////////////////////////
// LEAVE REQUEST SCHEMA
/////////////////////////////////////////

export const LeaveRequestSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  employeeId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  leaveType: z.string(),
  reason: z.string(),
  contactInfo: z.string().nullable(),
  isHalfDay: z.boolean(),
  numberOfDays: z.number(),
  status: z.string(),
  notes: z.string().nullable(),
  documents: z.string().array(),
  approvedDays: z.number().nullable(),
  approvedById: z.string().nullable(),
  approvedAt: z.coerce.date().nullable(),
  createdById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type LeaveRequest = z.infer<typeof LeaveRequestSchema>

/////////////////////////////////////////
// EMPLOYEE SCHEMA
/////////////////////////////////////////

export const EmployeeSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  userId: z.string(),
  roleId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Employee = z.infer<typeof EmployeeSchema>

/////////////////////////////////////////
// ROLE SCHEMA
/////////////////////////////////////////

export const RoleSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  permissions: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Role = z.infer<typeof RoleSchema>

/////////////////////////////////////////
// EXPENSE SCHEMA
/////////////////////////////////////////

export const ExpenseSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  categoryId: z.string(),
  amount: z.number(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Expense = z.infer<typeof ExpenseSchema>

/////////////////////////////////////////
// EXPENSE CATEGORY SCHEMA
/////////////////////////////////////////

export const ExpenseCategorySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>

/////////////////////////////////////////
// INCOME SCHEMA
/////////////////////////////////////////

export const IncomeSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  itemId: z.string(),
  amount: z.number(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Income = z.infer<typeof IncomeSchema>

/////////////////////////////////////////
// INCOME ITEM SCHEMA
/////////////////////////////////////////

export const IncomeItemSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type IncomeItem = z.infer<typeof IncomeItemSchema>

/////////////////////////////////////////
// SALE RETURN SCHEMA
/////////////////////////////////////////

export const SaleReturnSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  saleId: z.string(),
  reason: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SaleReturn = z.infer<typeof SaleReturnSchema>

/////////////////////////////////////////
// PURCHASE RETURN SCHEMA
/////////////////////////////////////////

export const PurchaseReturnSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  purchaseId: z.string(),
  reason: z.string(),
  amount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PurchaseReturn = z.infer<typeof PurchaseReturnSchema>

/////////////////////////////////////////
// SETTING SCHEMA
/////////////////////////////////////////

export const SettingSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  key: z.string(),
  value: JsonValueSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Setting = z.infer<typeof SettingSchema>

/////////////////////////////////////////
// INSTALLMENT SCHEMA
/////////////////////////////////////////

export const InstallmentSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  customerId: z.string(),
  saleId: z.string(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  dueDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Installment = z.infer<typeof InstallmentSchema>

/////////////////////////////////////////
// WARRANTY SCHEMA
/////////////////////////////////////////

export const WarrantySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  productId: z.string(),
  duration: z.number().int(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Warranty = z.infer<typeof WarrantySchema>

/////////////////////////////////////////
// PAYROLL SCHEMA
/////////////////////////////////////////

export const PayrollSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  employeeId: z.string(),
  amount: z.number(),
  period: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Payroll = z.infer<typeof PayrollSchema>

/////////////////////////////////////////
// FIXED ASSET SCHEMA
/////////////////////////////////////////

export const FixedAssetSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  purchaseDate: z.coerce.date(),
  value: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type FixedAsset = z.infer<typeof FixedAssetSchema>

/////////////////////////////////////////
// BOOKING SCHEMA
/////////////////////////////////////////

export const BookingSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  customerId: z.string(),
  date: z.coerce.date(),
  status: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Booking = z.infer<typeof BookingSchema>

/////////////////////////////////////////
// QUOTATION SCHEMA
/////////////////////////////////////////

export const QuotationSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  customerId: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Quotation = z.infer<typeof QuotationSchema>

/////////////////////////////////////////
// TRANSFER SCHEMA
/////////////////////////////////////////

export const TransferSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  fromOutletId: z.string(),
  toOutletId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Transfer = z.infer<typeof TransferSchema>

/////////////////////////////////////////
// DAMAGE SCHEMA
/////////////////////////////////////////

export const DamageSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  reason: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Damage = z.infer<typeof DamageSchema>

/////////////////////////////////////////
// PURCHASE ORDER SCHEMA
/////////////////////////////////////////

export const PurchaseOrderSchema = z.object({
  id: z.string().cuid(),
  poNumber: z.string(),
  organizationId: z.string(),
  supplierId: z.string(),
  status: z.string(),
  orderDate: z.coerce.date().nullable(),
  expectedDeliveryDate: z.coerce.date().nullable(),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>

/////////////////////////////////////////
// PURCHASE ORDER ITEM SCHEMA
/////////////////////////////////////////

export const PurchaseOrderItemSchema = z.object({
  id: z.string().cuid(),
  purchaseOrderId: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>
