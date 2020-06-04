import seedEmailTemplatesForShop from "./util/seedEmailTemplatesForShop.js";

/**
 * @name startup
 * @summary Called on startup
 * @param {Object} context App context
 * @returns {undefined}
 */
export default async function startup(context) {
  context.appEvents.on("afterShopCreate", async (payload) => {
    const { shop } = payload;

    // IMPORTANT: Disable automatic seed of email templates for shop
    // we handle email templates in separate plugin
    // this function adds email default email templates for every shop which spams collection
    // await seedEmailTemplatesForShop(context, shop._id);
  });
}
