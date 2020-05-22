import _ from "lodash";
import formatMoney from "@reactioncommerce/api-utils/formatMoney.js";
import { xformOrderItems } from "@reactioncommerce/reaction-graphql-xforms/order";
import { addAnonymousOrderToken } from "./anonymousToken.js";
import * as R from "ramda";

/**
 * @name formatDateForEmail
 * @method
 * @private
 * @summary helper to generate the order date as a string for emails
 * @param {Date} date The date to format
 * @returns {String} return date formatted as a MM/DD/YYYY string
 */
function formatDateForEmail(date) {
  const emailDate = new Date(date); // Clone date
  const year = emailDate.getFullYear(); // get year
  const month = emailDate.getMonth() + 1; // get month number + 1 (js has 0 indexed months)
  const day = emailDate.getDate(); // get day number (js has 1 indexed days)

  const paddedMonth = month > 9 ? `${month}` : `0${month}`; // generate padded month if necessary
  const paddedDay = day > 9 ? `${day}` : `0${day}`; // generate padded days if necessary

  return `${paddedDay}.${paddedMonth}.${year}`; // return MM/DD/YYYY formatted string
}

/**
 * @summary Builds data for rendering order emails
 * @param {Object} context - App context
 * @param {Object} input - Necessary input
 * @param {Object} input.order - The order document
 * @returns {Object} Data object to use when rendering email templates
 */
export default async function getDataForOrderEmail(context, { order }) {
  const { collections, getAbsoluteUrl, getFunctionsOfType } = context;
  const { Shops } = collections;

  // Get Shop information
  const shop = await Shops.findOne({ _id: order.shopId });

  // TODO need to make this fully support multiple fulfillment groups. Now it's just collapsing into one
  const amount = order.shipping.reduce((sum, group) => sum + group.invoice.total, 0);
  const discounts = order.shipping.reduce((sum, group) => sum + group.invoice.discounts, 0);
  const subtotal = order.shipping.reduce((sum, group) => sum + group.invoice.subtotal, 0);
  const taxes = order.shipping.reduce((sum, group) => sum + group.invoice.taxes, 0);
  const shippingCost = order.shipping.reduce((sum, group) => sum + group.invoice.shipping, 0);

  const { address: shippingAddress, shipmentMethod, tracking } = order.shipping[0];
  const { carrier } = shipmentMethod;
  const [firstPayment] = (order.payments || []);
  const { address: paymentBillingAddress, currency } = firstPayment || {};

  const shippingAddressForEmail = shippingAddress ? {
    honorifics: shippingAddress.honorifics,
    dateOfBirth: shippingAddress.dateOfBirth,
    firstName: shippingAddress.firstName,
    lastName: shippingAddress.lastName,
    phone: shippingAddress.phone,
    title: shippingAddress.title,
    address: `${shippingAddress.address1}${shippingAddress.address2 ? ` ${shippingAddress.address2}` : ""}`,
    houseNumber: shippingAddress.houseNumber,
    city: shippingAddress.city,
    region: shippingAddress.region,
    postal: shippingAddress.postal,
    country: shippingAddress.country
  } : null;

  let billingAddressForEmail = null;
  if (order.billingAddress) {
    billingAddressForEmail = {
      honorifics: order.billingAddress.honorifics,
      dateOfBirth: order.billingAddress.dateOfBirth,
      firstName: order.billingAddress.firstName,
      lastName: order.billingAddress.lastName,
      phone: order.billingAddress.phone,
      title: order.billingAddress.title,
      address: `${order.billingAddress.address1}${order.billingAddress.address2 ? ` ${order.billingAddress.address2}` : ""}`,
      houseNumber: order.billingAddress.houseNumber,
      city: order.billingAddress.city,
      region: order.billingAddress.region,
      postal: order.billingAddress.postal,
      country: order.billingAddress.country
    };
  } else if (paymentBillingAddress) {
    billingAddressForEmail = {
      honorifics: paymentBillingAddress.honorifics,
      dateOfBirth: paymentBillingAddress.dateOfBirth,
      firstName: paymentBillingAddress.firstName,
      lastName: paymentBillingAddress.lastName,
      phone: paymentBillingAddress.phone,
      title: paymentBillingAddress.title,
      address: `${paymentBillingAddress.address1}${paymentBillingAddress.address2 ? ` ${paymentBillingAddress.address2}` : ""}`,
      houseNumber: paymentBillingAddress.houseNumber,
      city: paymentBillingAddress.city,
      region: paymentBillingAddress.region,
      postal: paymentBillingAddress.postal,
      country: paymentBillingAddress.country
    };
  }

  const refunds = [];

  if (Array.isArray(order.payments)) {
    const promises = order.payments.map(async (payment) => {
      const shopRefunds = await context.queries.getPaymentMethodConfigByName(payment.name).functions.listRefunds(context, payment);
      const shopRefundsWithPaymentId = shopRefunds.map((shopRefund) => ({ ...shopRefund, paymentId: payment._id }));
      refunds.push(...shopRefundsWithPaymentId);
    });
    await Promise.all(promises);
  }

  const refundTotal = refunds.reduce((acc, refund) => acc + refund.amount, 0);

  const userCurrency = (currency && currency.userCurrency) || shop.currency;

  // Get user currency exchange rate at time of transaction
  const userCurrencyExchangeRate = (currency && currency.exchangeRate) || 1;

  // Combine same products into single "product" for display purposes
  const combinedItems = [];

  // Transform all order items to add images, etc.
  const adjustedOrderGroups = await Promise.all(order.shipping.map(async (group) => {
    let items = await xformOrderItems(context, group.items);

    items = items.map((item) => ({
      ...item,
      placeholderImage: getAbsoluteUrl("/resources/placeholder.gif"),
      price: {
        ...item.price,
        // Add displayAmount to match user currency settings
        displayAmount: formatMoney(item.price.amount * userCurrencyExchangeRate, userCurrency)
      },
      subtotal: {
        ...item.subtotal,
        // Add displayAmount to match user currency settings
        displayAmount: formatMoney(item.subtotal.amount * userCurrencyExchangeRate, userCurrency)
      },
      // These next two are for backward compatibility with existing email templates.
      // New templates should use `imageURLs` instead.
      productImage: item.imageURLs && item.imageURLs.large,
      variantImage: item.imageURLs && item.imageURLs.large
    }));

    return { ...group, items };
  }));

  // Loop through all items in the order. The items are split into individual items
  const orderItems = adjustedOrderGroups.reduce((list, group) => [...list, ...group.items], []);
  for (const orderItem of orderItems) {
    // Find an existing item in the combinedItems array
    const foundItem = combinedItems.find((combinedItem) => combinedItem.variantId === orderItem.variantId);

    // Increment the quantity count for the duplicate product variants
    if (foundItem) {
      foundItem.quantity += orderItem.quantity;
    } else {
      // Otherwise push the unique item into the combinedItems array
      combinedItems.push(orderItem);
    }
  }

  const copyrightDate = new Date().getFullYear();

  // storefront URLs are technically optional, and headless is OK.
  // In that case we'll assume the email template does not use nor need
  // the orderUrl property, so it will be null in the order email data object.
  let orderUrl = _.get(shop, "storefrontUrls.storefrontOrderUrl", null);
  if (orderUrl) {
    let token = "";
    orderUrl = orderUrl.replace(":orderId", encodeURIComponent(order.referenceId));
    const isAnonymous = !order.accountId;
    const wantsToken = orderUrl.includes(":token");
    if (isAnonymous && wantsToken) {
      token = await addAnonymousOrderToken(context, order._id);
    }
    // Replace :token either with empty string or a toke
    orderUrl = orderUrl.replace(":token", encodeURIComponent(token));
  }

  const isInAdvance = isInAdvancePayment(order);
  const isInSantanderManual = isInSantanderManualPayment(order);
  const isInSantanderManualDe = isInSantanderManualDePayment(order);
  const isCashpresso = isCashpressoPayment(order);
  const isKlarna = isKlarnaPayment(order);
  const isCreated = isCreatedPayment(order);
  const isCompleted = isCompletedPayment(order);
  const isFailed = isFailedPayment(order);
  const isCanceled = isCanceledPayment(order);
  const isCanceledOrder = isCanceledOrderCheck(order);


  
  let bankDetails = null;
  // TODO: Why do we need bank details in santander manual de?
  if (isInAdvance || isInSantanderManual || isInSantanderManualDe) {
    const paymentShopId = getPaymentShopId(order);
    bankDetails = await getBankDetails(context, paymentShopId);
  }

  if (isCashpresso) {
    bankDetails = { 
      url: getCashpressoUrl(order) 
    }
  }

  const itemsWithAttributes = await Promise.all(combinedItems.map(async item => {
    const result = await getAttributes(context, item, order.ordererPreferredLanguage)
    const attributes = R.pick(['productAttributes', 'variantAttributes'], R.pathOr({}, ['0'], result))

    return { ...item, ...attributes, shouldDisplayMileage: shouldDisplayMileage(attributes) }
  }))

const customGetDataForOrderEmailFuncs = getFunctionsOfType('custom/getDataForOrderConfirmationEmail')
  const customData = customGetDataForOrderEmailFuncs[0]()

  // Merge data into single object to pass to email template
  return {
    // Shop Data
    shop,
    contactEmail: shop.emails[0].address,
    homepage: _.get(shop, "storefrontUrls.storefrontHomeUrl", null),
    copyrightDate,
    legalName: _.get(shop, "addressBook[0].company"),
    physicalAddress: {
      address: `${_.get(shop, "addressBook[0].address1")}`,
      city: _.get(shop, "addressBook[0].city"),
      postal: _.get(shop, "addressBook[0].postal")
    },
    shopName: shop.name,
    socialLinks: {
      display: true,
      facebook: {
        display: true,
        icon: getAbsoluteUrl("/resources/email-templates/facebook-icon.png"),
        link: "https://www.facebook.com/GreenstormMarketplaceDE/"
      },
      googlePlus: {
        display: true,
        icon: getAbsoluteUrl("/resources/email-templates/google-plus-icon.png"),
        link: "https://plus.google.com"
      },
      twitter: {
        display: true,
        icon: getAbsoluteUrl("/resources/email-templates/twitter-icon.png"),
        link: "https://twitter.com/GreenstormEbike"
      }
    },
    order: {
      ...order,
      shipping: adjustedOrderGroups,
      isCanceledOrder
    },
    billing: {
      address: billingAddressForEmail,
      payments: (order.payments || []).map((payment) => ({
        displayName: payment.displayName,
        displayAmount: formatMoney(payment.amount * userCurrencyExchangeRate, userCurrency),
        isInAdvance,
        isInSantanderManual,
        isInSantanderManualDe,
        isCashpresso,
        isKlarna,
        isCreated,
        isCompleted,
        isFailed,
        isCanceled,
        bankDetails
      })),
      subtotal: formatMoney(subtotal * userCurrencyExchangeRate, userCurrency),
      shipping: formatMoney(shippingCost * userCurrencyExchangeRate, userCurrency),
      taxes: formatMoney(taxes * userCurrencyExchangeRate, userCurrency),
      discounts: formatMoney(discounts * userCurrencyExchangeRate, userCurrency),
      refunds: formatMoney(refundTotal * userCurrencyExchangeRate, userCurrency),
      total: formatMoney(
        (subtotal + shippingCost + taxes - discounts) * userCurrencyExchangeRate,
        userCurrency
      ),
      adjustedTotal: formatMoney(
        (amount - refundTotal) * userCurrencyExchangeRate,
        userCurrency
      ),
      santanderMin: formatMoney(
        (subtotal / 48) * userCurrencyExchangeRate,
        userCurrency
      )
    },
    combinedItems: itemsWithAttributes,
    orderDate: formatDateForEmail(order.createdAt),
    orderUrl,
    shipping: {
      address: shippingAddressForEmail,
      carrier,
      tracking
    },
    customData
  };
}

async function shouldDisplayMileage(attributes) {
  return R.path(['variantAttributes', 'options', 'new'], attributes) === 'false'
}

async function getAttributes(context, item, lng) {
  const { collections: { Catalog } } = context;
  const result = await Catalog.aggregate([
    { $match: { "product.productId": item.productId } },
    { $unwind: "$product.variants" },
    { $match: { "product.variants.variantId": item.variantId } },
    {
      $project: {
        productAttributes: "$product.attributes",
        variantAttributes: "$product.variants.attributes"
      }
    },
    {
      $lookup: {
        from: '_integrations_dictionaries',
        let: { colorId: '$variantAttributes.dictionary.color' }, 
        pipeline: [
          { 
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: [ '$$colorId', '$originId' ]
                  },
                  {
                    $eq: [ 'color', '$key' ]
                  },
                  {
                    $eq: [ lng, '$language' ]
                  }
                ]
              }
            }
          }
        ],
        as: 'variantAttributes.dictionary.translatedColor'
      }
    }
  ]).toArray();

  return result;
}

async function getBankDetails(context, shopId) {
  const {
    collections: { Shops }
  } = context;
  const shop = await Shops.findOne({ _id: shopId }, { metafields: 1, addressBook: 1 });
  const metafields = shop.metafields;
  const addressBook = shop.addressBook;
  const bankDetails = metafields
    .filter((metafield) => ["bankName", "iban", "bic"].includes(metafield.key))
    .reduce((acc, metafield) => {
      acc[metafield.key] = metafield.value;
      return acc;
    }, {});

  const locationDetails = {
    company: addressBook[0].company,
    address1: addressBook[0].address1,
    region: addressBook[0].region,
    postal: addressBook[0].postal,
    city: addressBook[0].city,
    country: addressBook[0].country,
  }

  return { ...bankDetails, ... locationDetails };
}

function getCashpressoUrl(order) {
  return R.path(['payments', 0, 'data', 'cashpresso', 'url'])(order);
}

function getPaymentShopId(order) {
  return order.shipping[0].items[0].shopId;
}

function isInAdvancePayment(order) {
  // string set in reaction-plugin-payment-in-advance
  return order.payments[0].name === "in_advance";
}

function isInSantanderManualPayment(order) {
  // string set in reaction-plugin-payment-in-advance
  return order.payments[0].name === "santander_manual";
}

function isInSantanderManualDePayment(order) {
  // string set in reaction-plugin-payment-in-advance
  return order.payments[0].name === "santander_manual_de";
}

function isCashpressoPayment(order) {
  // string set in reaction-plugin-payment-in-advance
  return order.payments[0].name === "cashpresso_instalment";
}

function isKlarnaPayment (order) {
  return order.payments[0].name === "klarna";
}

function isCreatedPayment(order) {
  return order.payments[0].status === "created";
}

function isCompletedPayment(order) {
  return order.payments[0].status === "completed";
}

function isFailedPayment(order) {
  return order.payments[0].status === "failed";
}

function isCanceledPayment(order) {
  return order.payments[0].status === "canceled";
}

function isCanceledOrderCheck(order) {
  return order.workflow.status === "coreOrderWorkflow/canceled";
}
