export const Mongo = {
  Collection: jest.fn().mockImplementation(() => ({
    _ensureIndex: (jest.fn()),
    attachSchema: (jest.fn()),
    rawCollection: jest.fn().mockImplementation(() => ({
      createIndex: (jest.fn()),
    }))
  }))
};

export const MongoInternals = {
  defaultRemoteCollectionDriver: jest.fn().mockImplementation(() => ({
    mongo: {
      db: {
        collection: jest.fn().mockImplementation(() => ({
        }))
      }
    }
  }))
};
