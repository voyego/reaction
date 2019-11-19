import addInvoiceToGroup from "./addInvoiceToGroup";
import addShipmentMethodToGroup from "./addShipmentMethodToGroup";
import addTaxesToGroup from "./addTaxesToGroup";
import compareExpectedAndActualTotals from "./compareExpectedAndActualTotals";
import getSurchargesForGroup from "./getSurchargesForGroup";

/**
 * @summary Call this with a fulfillment group when the items, item quantities, or
 *   something else relevant about the group may have changed. All shipping, tax,
 *   and surcharge values will be recalculated and invoice totals updated.
 * @param {Object} context App context
 * @param {Object} [billingAddress] The primary billing address for the order, if known
 * @param {String} [cartId] ID of the cart from which the order is being placed, if applicable
 * @param {String} currencyCode Currency code for all money values
 * @param {Number} [discountTotal] Calculated discount total
 * @param {Number} [expectedGroupTotal] Expected total, if you want to verify the calculated total matches
 * @param {Object} group The fulfillment group to mutate
 * @param {String} orderId ID of existing or new order to which this group will belong
 * @param {String} selectedFulfillmentMethodId ID of the fulfillment method option chosen by the user
 * @return {Promise<Object>} Object with surcharge and tax info on it
 */
export default async function updateGroupTotals(context, {
  billingAddress = null,
  cartId = null,
  currencyCode,
  discountTotal = 0,
  expectedGroupTotal,
  group,
  orderId,
  selectedFulfillmentMethodId
}) {
  // Apply shipment method
  await addShipmentMethodToGroup(context, {
    billingAddress,
    cartId,
    currencyCode,
    discountTotal,
    group,
    orderId,
    selectedFulfillmentMethodId
  });

  const {
    groupSurcharges,
    groupSurchargeTotal
  } = await getSurchargesForGroup(context, {
    billingAddress,
    cartId,
    currencyCode,
    discountTotal,
    group,
    orderId,
    selectedFulfillmentMethodId
  });

  // Calculate and set taxes. Mutates group object in addition to returning the totals.
  const { taxTotal, taxableAmount } = await addTaxesToGroup(context, {
    billingAddress,
    cartId,
    currencyCode,
    discountTotal,
    group,
    orderId
  });

  // Build and set the group invoice
  addInvoiceToGroup({
    currencyCode,
    group,
    groupDiscountTotal: discountTotal,
    groupSurchargeTotal,
    taxableAmount,
    taxTotal
  });

  return {
    groupSurcharges,
    groupSurchargeTotal,
    taxableAmount,
    taxTotal
  };
}
