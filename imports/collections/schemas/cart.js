import SimpleSchema from "simpl-schema";
import { registerSchema } from "@reactioncommerce/schemas";
import { Address } from "./address";
import { Money, AppliedSurcharge } from "./core";
import { Shipment, ShippingParcel } from "./shipping";
import { Workflow } from "./workflow";
import { Metafield } from "./metafield";

const DictionarySchemaVariant = new SimpleSchema({
  condition: {
    type: String,
    optional: true
  },
  color: {
    type: String,
    optional: true
  },
  milageGroup: {
    type: String,
    optional: true
  }
});
/*const SystemSchemaVariant = new SimpleSchema({
  originId: {
    type: String,
    optional: true
  },
  priceDiscountPercentage: {
    type: String,
    optional: true
  },
  priceDiscountAbsolute: {
    type: String,
    optional: true
  },
  priceDiscountMileage: {
    type: String,
    optional: true
  },
  isTaxable: {
    type: String,
    optional: true
  },
  taxCode: {
    type: String,
    optional: true
  }
});


const OptionsSchemaVariant = new SimpleSchema({
  new: {
    type: String,
    optional: true
  },
  code: {
    type: String,
    optional: true
  },
  frameHeight: {
    type: String,
    optional: true
  },
  frameNumber: {
    type: String,
    optional: true
  },
  wheelDiamete: {
    type: String,
    optional: true
  },
  mileage: {
    type: String,
    optional: true
  },
  image: {
    type: String,
    optional: true
  }
});*/

const GsVariantAttributes = new SimpleSchema({
  DictionarySchemaVariant: DictionarySchemaVariant
});


/**
 * @name CartItemAttribute
 * @memberof Schemas
 * @type {SimpleSchema}
 * @property {String} label required
 * @property {String} value optional
 */
const CartItemAttribute = new SimpleSchema({
  label: String,
  value: {
    type: String,
    optional: true
  }
});

const HepsterData = new SimpleSchema({
  price: {
    type: Number,
    optional: true
  },
  coveragePrice: {
    type: Number,
    optional: true
  },
  qualityId: {
    type: String,
    optional: true
  },
  productId: {
    type: String,
    optional: true
  }
});

/**
 * @name CartItem
 * @memberof Schemas
 * @type {SimpleSchema}
 * @property {String} _id required
 * @property {String} addedAt required
 * @property {CartItemAttribute[]} attributes Attributes of this item
 * @property {String} createdAt required
 * @property {Metafield[]} metafields
 * @property {String} optionTitle optionTitle from the selected variant
 * @property {ShippingParcel} parcel Currently, parcel is in simple product schema. Need to include it here as well.
 * @property {Money} price The current price of this item
 * @property {Money} priceWhenAdded The price+currency at the moment this item was added to this cart
 * @property {String} productId required
 * @property {String} productSlug Product slug
 * @property {String} productType Product type
 * @property {String} productVendor Product vendor
 * @property {Number} quantity required
 * @property {String} shopId Cart Item shopId
 * @property {String} title Cart Item title
 * @property {Object} transaction Transaction associated with this item
 * @property {String} updatedAt required
 * @property {String} variantId required
 * @property {String} variantTitle Title from the selected variant
 */
export const CartItem = new SimpleSchema({
  "_id": String,
  "addedAt": Date,
  "attributes": {
    type: Array,
    optional: true
  },
  "attributes.$": CartItemAttribute,
  "GsVariantAttributes": GsVariantAttributes,
  "compareAtPrice": {
    type: Money,
    optional: true
  },
  "createdAt": Date,
  "metafields": {
    type: Array,
    optional: true
  },
  "metafields.$": Metafield,
  "optionTitle": {
    type: String,
    optional: true
  },
  "parcel": {
    type: ShippingParcel,
    optional: true
  },
  "price": Money,
  "priceWhenAdded": Money,
  "productId": String,
  "productSlug": {
    type: String,
    optional: true
  },
  "productType": {
    label: "Product Type",
    type: String,
    optional: true
  },
  "productTagIds": {
    label: "Product Tags",
    type: Array,
    optional: true
  },
  "productTagIds.$": String,
  "hepster": {
    type: HepsterData,
    optional: true
  },
  "productVendor": {
    label: "Product Vendor",
    type: String,
    optional: true
  },
  "quantity": {
    label: "Quantity",
    type: SimpleSchema.Integer,
    min: 0
  },
  "shopId": {
    type: String,
    label: "Cart Item shopId"
  },
  "subtotal": Money,
  "title": {
    type: String,
    label: "CartItem Title"
  },
  "transaction": {
    type: Object,
    optional: true,
    blackbox: true
  },
  "updatedAt": Date,
  "variantId": {
    type: String,
    optional: true
  },
  "variantTitle": {
    type: String,
    optional: true
  }
});

registerSchema("CartItem", CartItem);

/**
 * @name CartItems
 * @memberof Schemas
 * @summary Used in check by inventory/addReserve method
 * @type {SimpleSchema}
 * @property {CartItem[]} items an Array of CartItem optional
 */
export const CartItems = new SimpleSchema({
  "items": {
    type: Array,
    optional: true
  },
  "items.$": {
    type: CartItem
  }
});

registerSchema("CartItems", CartItems);

/**
 * @name Cart
 * @memberof Schemas
 * @type {SimpleSchema}
 * @property {String} _id required for check of users' carts
 * @property {String} shopId required, Cart ShopId
 * @property {String} accountId Account ID for account carts, or null for anonymous
 * @property {String} anonymousAccessToken Token for accessing anonymous carts, null for account carts
 * @property {String} email optional
 * @property {CartItem[]} items Array of CartItem optional
 * @property {Shipment[]} shipping Array of Shipment optional, blackbox
 * @property {Payment[]} billing Array of Payment optional, blackbox
 * @property {String} sessionId Optional and deprecated
 * @property {Number} discount optional
 * @property {Surcharges[]} surcharges optional
 * @property {Workflow} workflow optional
 * @property {Date} createdAt required
 * @property {Date} updatedAt optional
 */
export const Cart = new SimpleSchema({
  "_id": {
    type: String,
    optional: true
  },
  "shopId": {
    type: String,
    label: "Cart ShopId"
  },
  "accountId": {
    type: String,
    optional: true
  },
  "anonymousAccessToken": {
    type: String,
    optional: true
  },
  "currencyCode": String,
  "billingAddress": {
    type: Address,
    optional: true
  },
  "sessionId": {
    type: String,
    optional: true
  },
  "referenceId": {
    type: String,
    optional: true
  },
  "email": {
    type: String,
    optional: true,
    regEx: SimpleSchema.RegEx.Email
  },
  "dateOfBirth": {
    type: Date,
    optional: true
  },
  "items": {
    type: Array,
    optional: true
  },
  "items.$": {
    type: CartItem
  },
  "shipping": {
    type: Array,
    optional: true
  },
  "shipping.$": {
    type: Shipment
  },
  /* Working to get rid of cart.billing, but currently still where discounts are applied to carts */
  "billing": {
    type: Array,
    optional: true
  },
  "billing.$": {
    type: Object,
    blackbox: true
  },
  "bypassAddressValidation": {
    type: Boolean,
    optional: true,
    defaultValue: false
  },
  "discount": {
    type: Number,
    optional: true
  },
  "surcharges": {
    type: Array,
    optional: true
  },
  "surcharges.$": {
    type: AppliedSurcharge
  },
  "workflow": {
    type: Workflow,
    optional: true,
    defaultValue: {}
  },
  "createdAt": {
    type: Date
  },
  "updatedAt": {
    type: Date,
    optional: true
  }
});

registerSchema("Cart", Cart);
