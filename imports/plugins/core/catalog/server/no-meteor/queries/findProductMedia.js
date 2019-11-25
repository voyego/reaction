import Logger from "@reactioncommerce/logger";
import * as R from "ramda";

export default async function findProductMedia(context, variantId, productId) {
  try {
    const {
      collections: { Products }
    } = context;
    // variant images have greater priority than simple images
    const relatedProducts = await Products.find(
      {
        _id: {
          $in: [variantId, productId]
        }
      },
      {
        sort: {
          type: -1
        }
      }
    ).toArray();

    let media = [{
      URLs: {},
      productId,
      variantId,
      toGrid: 0,
      priority: 1
    }];

    for (const relatedProduct of relatedProducts) {
      if (!media[0].URLs.original) {
        if (R.path(['attributes', 'options', 'images', 0, 'medium'])(relatedProduct)) {
          media[0].URLs.medium = R.path(['attributes', 'options', 'images', 0, 'medium'])(relatedProduct);
        }
        if (R.path(['attributes', 'options', 'images', 0, 'original'])(relatedProduct)) {
          media[0].URLs.large = R.path(['attributes', 'options', 'images', 0, 'original'])(relatedProduct);
          media[0].URLs.original = R.path(['attributes', 'options', 'images', 0, 'original'])(relatedProduct);
        }
        if (R.path(['attributes', 'options', 'images', 0, 'small'])(relatedProduct)) {
          media[0].URLs.small = R.path(['attributes', 'options', 'images', 0, 'small'])(relatedProduct);
        }
        if (R.path(['attributes', 'options', 'images', 0, 'thumbnail'])(relatedProduct)) {
          media[0].URLs.thumbnail = R.path(['attributes', 'options', 'images', 0, 'thumbnail'])(relatedProduct);
        }
      }
    }

    return { variant: { media: (media[0].URLs.original) ? media : [] } };
  } catch (err) {
    Logger.error("Error occured during image preperation", err);
    return { variant: { media: [] } };
  }
}
