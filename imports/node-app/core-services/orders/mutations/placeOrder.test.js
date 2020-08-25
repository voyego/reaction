import mockContext from '@reactioncommerce/api-utils/tests/mockContext.js'
import Factory from '/imports/test-utils/helpers/factory' // TODO: remove cross-plugin import (https://github.com/reactioncommerce/reaction/issues/5653)
import placeOrder from './placeOrder.js'

beforeEach(() => {
  jest.resetAllMocks()
  mockContext.getFunctionsOfType.mockReturnValue([])
})

test("throws if order isn't supplied", async () => {
  await expect(placeOrder(mockContext, {})).rejects.toThrowErrorMatchingSnapshot()
})
