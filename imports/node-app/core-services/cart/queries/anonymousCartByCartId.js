import hashToken from '@reactioncommerce/api-utils/hashToken.js'
import ReactionError from '@reactioncommerce/reaction-error'

/**
 * @name anonymousCartByCartId
 * @method
 * @memberof Cart/NoMeteorQueries
 * @summary Query the Cart collection for a cart with the provided cartId
 * @param {Object} context - an object containing the per-request state
 * @param {Object} params - request parameters
 * @param {String} [params.cartId] - Cart id to include
 * @param {String} [params.token] - Anonymous cart token
 * @returns {Promise<Object>|undefined} - A Cart document, if one is found
 */
export default async function anonymousCartByCartId (context, { cartId, token, language } = {}) {
  const { collections, getFunctionsOfType } = context
  const { Cart } = collections

  if (!cartId) {
    throw new ReactionError('invalid-param', 'You must provide a cartId')
  }

  const cart = await Cart.findOne({
    _id: cartId,
    anonymousAccessToken: hashToken(token)
  })

  for (const mutateCart of getFunctionsOfType('xformCartWithLanguage')) {
    await mutateCart(context, cart, language)
  }

  return cart
}
