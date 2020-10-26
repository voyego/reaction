/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default function startup(context) {
  const { appEvents, collections } = context;
  const { SimpleInventory, Products } = collections;

  // Whenever inventory is updated for any sellable variant, the plugin that did the update is
  // expected to emit `afterInventoryUpdate`. We listen for this and keep the boolean fields
  // on the CatalogProduct correct.
  appEvents.on("afterInventoryUpdate", async ({ productConfiguration }) => {
    const simpleInventory = await SimpleInventory.findOne({ "productConfiguration.productVariantId": productConfiguration.productVariantId })
    await Products.updateOne({ _id: productConfiguration.productId }, { $set: { "attributes.system.inventoryInStock": simpleInventory.attributes.system.inventoryInStock }})
    context.mutations.partialProductPublish(context, { productId: productConfiguration.productId, startFrom: "inventory" })
  })

  appEvents.on("afterBulkInventoryUpdate", async ({ productConfigurations }) => {
    // Since it is a bulk update and many of the product configurations may be for the same
    // productId, we can avoid unnecessary work by running the update only once per productId.
    const uniqueProductIds = productConfigurations.reduce((list, productConfiguration) => {
      const { productId } = productConfiguration;
      if (!list.includes(productId)) {
        list.push(productId);
      }
      return list;
    }, []);
    uniqueProductIds.forEach((productId) => {
      context.mutations.partialProductPublish(context, { productId, startFrom: "inventory" });
    });
    /* TODO voyego: move this to partialProductPublish
    const variants = await Products.find(
      {
        ancestors: productId,
        isDeleted: { $ne: true },
        isVisible: true
      },
      {
        _id: 1,
        ancestors: 1,
        shopId: 1
      }
    ).toArray();

    const topVariants = variants.filter((variant) => variant.ancestors.length === 1);
    if (topVariants.length === 0) return;

    const topVariantsInventoryInfo = await context.queries.inventoryForProductConfigurations(context, {
      fields: ["isBackorder", "isLowQuantity", "isSoldOut"],
      productConfigurations: topVariants.map((option) => ({
        isSellable: !variants.some((variant) => variant.ancestors.includes(option._id)),
        productId: option.ancestors[0],
        productVariantId: option._id
      })),
      shopId: topVariants[0].shopId
    });

    const productQuantity = topVariantsInventoryInfo.reduce(
      (sum, { inventoryInfo: { inventoryAvailableToSell } }) => sum + inventoryAvailableToSell,
      0
    );

    if (!PRODUCT_LOW_INVENTORY_THRESHOLD) {
      Logger.warn("Missing .env variable PRODUCT_LOW_INVENTORY_THRESHOLD, using default value.");
    }

    await Catalog.updateOne(
      { "product.productId": productId },
      {
        $set: {
          "product.isBackorder": topVariantsInventoryInfo.every(({ inventoryInfo }) => inventoryInfo.isBackorder),
          "product.isLowQuantity":
            productQuantity < (PRODUCT_LOW_INVENTORY_THRESHOLD || DEFAULT_LOW_INVENTORY_THRESHOLD),
          "product.isSoldOut": topVariantsInventoryInfo.every(({ inventoryInfo }) => inventoryInfo.isSoldOut)
        }
      }
    );
    */
  });
}
