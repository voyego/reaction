/**
 * @summary Update account cart to have only the anonymous cart items, delete anonymous
 *   cart, and return updated accountCart.
 * @todo When we add a "save for later" / "wish list" feature, we may want to update this
 *   to move existing account cart items to there.
 * @param {Object} accountCart The account cart document
 * @param {Object} anonymousCart The anonymous cart document
 * @param {Object} anonymousCartSelector The MongoDB selector for the anonymous cart
 * @param {Object} context App context
 * @returns {Object} The updated account cart
 */
export default async function reconcileCartsKeepAnonymousCart({
  anonymousCart,
  accountCartSelector,
  context
}) {
  const { collections, accountId } = context;
  const { Cart } = collections;
  await Cart.deleteOne(accountCartSelector);

  const updatedCart = {
    ...anonymousCart,
    anonymousAccessToken: null,
    accountId,
    updatedAt: new Date()
  };

  const savedCart = await context.mutations.saveCart(context, updatedCart);

  return savedCart;
}
