import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeCartItemOpaqueId } from "@reactioncommerce/reaction-graphql-xforms/cart";

export default {
  _id: (node) => encodeCartItemOpaqueId(node._id),
  shop: resolveShopFromShopId
};
