/* eslint-disable node/no-deprecated-api */
/* TODO: revisit `url.parse` throughout Reaction */

export default {
  shopById: (context, _id) => context.dataLoaders.Shops.load(_id),
  shopBySlug: (context, slug) => context.collections.Shops.findOne({ slug }),
  primaryShop: async (context) => {
    const { collections } = context;
    const { Shops } = collections;
    const shop = await Shops.findOne({ shopType: "primary" });
    return shop;
  }
};
