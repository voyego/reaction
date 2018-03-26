import { decodeAccountOpaqueId } from "@reactioncommerce/reaction-graphql-xforms/account";
import { xformAddressInput } from "@reactioncommerce/reaction-graphql-xforms/address";

/**
 * @name updateAccountAddressBookEntry
 * @method
 * @summary resolver for the updateAccountAddressBookEntry GraphQL mutation
 * @param {Object} _ - unused
 * @param {Object} args - an object of all arguments that were sent by the client
 * @param {String} [args.accountId] - optional opaque ID of account on which entry should be updated, for admins
 * @param {String} args.addressId - opaque ID of the address to edit
 * @param {Object} args.updatedAddress - updated address object, in GraphQL schema format
 * @param {Object} context - an object containing the per-request state
 * @return {Object} UpdateAccountAddressBookEntryPayload
 */
export default function updateAccountAddressBookEntry(_, { input }, context) {
  const { accountId, addressId, clientMutationId, type, updates } = input;
  const dbAccountId = decodeAccountOpaqueId(accountId);
  const address = xformAddressInput({ ...updates, _id: addressId });
  context.methods["accounts/addressBookUpdate"](context, [address, dbAccountId, type]);
  // const account = context.methods["accounts/addressBookUpdate"](context, [address, dbAccountId, type]);
  // TODO returns the whole updated account. Need to grab just the address that was updated,
  // transform it, and return that.
  return {
    address: {},
    clientMutationId
  };
}
