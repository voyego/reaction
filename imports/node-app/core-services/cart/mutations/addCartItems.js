import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";
import addCartItemsUtil from "../util/addCartItems.js";
import Logger from "@reactioncommerce/logger";

/**
 * @method addCartItems
 * @summary Add one or more items to a cart
 * @param {Object} context -  an object containing the per-request state
 * @param {Object} input - mutation input
 * @param {Object} [options] - Options
 * @param {Boolean} [options.skipPriceCheck] - For backwards compatibility, set to `true` to skip checking price.
 *   Skipping this is not recommended for new code.
 * @returns {Promise<Object>} An object with `cart`, `minOrderQuantityFailures`, and `incorrectPriceFailures` properties.
 *   `cart` will always be the full updated cart document, but `incorrectPriceFailures` and
 *   `minOrderQuantityFailures` may still contain other failures that the caller should
 *   optionally retry with the corrected price or quantity.
 */
export default async function addCartItems(context, input, options = {}) {
  const { cartId, items, token } = input;
  const { appEvents, collections, accountId = null } = context;
  const { Cart } = collections;

  let selector;
  if (accountId) {
    // Account cart
    selector = { _id: cartId, accountId };
  } else {
    // Anonymous cart
    if (!token) {
      throw new ReactionError("not-found", "Cart not found");
    }

    selector = { _id: cartId, anonymousAccessToken: hashToken(token) };
  }

  const cart = await Cart.findOne(selector);
  if (!cart) {
    Logger.error({ message: 'Cart not found', selector });
    throw new ReactionError("not-found", "Cart not found");
  }

  const {
    incorrectPriceFailures,
    minOrderQuantityFailures,
    updatedItemList
  } = await addCartItemsUtil(context, cart.items, items, { skipPriceCheck: options.skipPriceCheck });

  const updatedCart = {
    ...cart,
    items: updatedItemList,
    updatedAt: new Date()
  };

  const savedCart = await context.mutations.saveCart(context, updatedCart);

  await appEvents.emit("afterCartUpdate", {
    cart: savedCart,
    type: "addItem"
  })

  const cartAfterCartUpdate = Cart.findOne({ _id: cart._id })

  return { cart: cartAfterCartUpdate, incorrectPriceFailures, minOrderQuantityFailures };
}
