import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import { makeExecutableSchema, mergeSchemas } from "apollo-server";
import { ApolloServer } from "apollo-server-express";
import config from "./config";
import buildContext from "./util/buildContext";
import getErrorFormatter from "./util/getErrorFormatter";
import createDataLoaders from "./util/createDataLoaders";
import { CacheContents } from '../../plugins/custom/reaction-plugin-integrations/lib/collections'
import md5 from 'md5'

const OPERATION_NAME_WHITELIST_RESPONSE_CACHE = process.env.OPERATION_NAME_WHITELIST_RESPONSE_CACHE

let whitelistCacheOperationName

if (OPERATION_NAME_WHITELIST_RESPONSE_CACHE) {
  whitelistCacheOperationName = OPERATION_NAME_WHITELIST_RESPONSE_CACHE.split(',').filter(el => el !== "")
} else {
  whitelistCacheOperationName = ["tagsQuery", "catalogItemsQuery", "getGridFiltersQuery", "tagQuery"]
}

const DEFAULT_GRAPHQL_PATH = "/graphql-beta";
const ENABLE_RESPONSE_CACHE = process.env.ENABLE_RESPONSE_CACHE

const resolverValidationOptions = {
  // After we fix all errors that this prints, we should probably go
  // back to `true` (the default)
  requireResolversForResolveType: false
};

/**
 * @name createApolloServer
 * @method
 * @memberof GraphQL
 * @summary Creates an express app with Apollo Server route
 * @param {Object} options Options
 * @returns {ExpressApp} The express app
 */
export default function createApolloServer(options = {}) {
  const { context: contextFromOptions, expressMiddleware, resolvers } = options;
  const path = options.path || DEFAULT_GRAPHQL_PATH;

  // We support passing in either a typeDefs string or an already executable schema,
  // for the case where a plugin is stitching in a schema from an external API.
  const schemas = options.schemas || [];
  const schemasToMerge = schemas.filter((td) => typeof td !== "string");
  const typeDefs = schemas.filter((td) => typeof td === "string");

  // Create a custom Express server so that we can add our own middleware and HTTP routes
  const app = express();

  let schema = makeExecutableSchema({ typeDefs, resolvers, resolverValidationOptions });
  if (schemasToMerge.length) {
    schema = mergeSchemas({ schemas: [schema, ...schemasToMerge] });
  }

  const apolloServer = new ApolloServer({
    plugins: [
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              if (ENABLE_RESPONSE_CACHE) {
                try {
                  const operationName = requestContext.request.operationName
                  if (whitelistCacheOperationName.includes(operationName)) {
                    const key = md5(JSON.stringify({ 
                      operationName: requestContext.request.operationName,
                      query: requestContext.request.query,
                      variables: requestContext.request.variables
                     }))
                    if (!CacheContents.findOne({ key })) {
                      const response = requestContext.response
                      CacheContents.rawCollection().insertOne({ key, response, createdAt: new Date() })
                    }
                  }
                } catch(err) {
                  // Handle error so continue with response if error occured
                  console.log('err', err)
                }
              }
            }
          }
        },

      }
    ],
    async context({ connection, req }) {
      const context = { ...contextFromOptions };

      // For a GraphQL subscription WebSocket request, there is no `req`
      if (connection) return context;

      // Express middleware should have already set req.user if there is one
      await buildContext(context, req);

      await createDataLoaders(context);

      return context;
    },
    debug: options.debug || false,
    formatError: getErrorFormatter(),
    schema,
    subscriptions: {
      path
    },
    introspection: config.GRAPHQL_INTROSPECTION_ENABLED,
    playground: config.GRAPHQL_PLAYGROUND_ENABLED
  });

  const gqlMiddleware = expressMiddleware.filter((def) => def.route === "graphql" || def.route === "all");

  // GraphQL endpoint, enhanced with JSON body parser
  app.use.apply(app, [
    path,
    // set a higher limit for data transfer, which can help with GraphQL mutations
    // `express` default is 100kb
    // AWS default is 5mb, which we'll use here
    bodyParser.json({ limit: config.BODY_PARSER_SIZE_LIMIT }),
    // Enable `cors` to set HTTP response header: Access-Control-Allow-Origin: *
    // Although the `cors: true` option to `applyMiddleware` below does this already
    // for successful requests, we need it to be set here, before token middleware,
    // so that the header is set on 401 responses, too. Otherwise it breaks our 401
    // refresh handling on the clients.
    cors(),
    ...gqlMiddleware.filter((def) => def.stage === "first").map((def) => def.fn(contextFromOptions)),
    ...gqlMiddleware.filter((def) => def.stage === "before-authenticate").map((def) => def.fn(contextFromOptions)),
    ...gqlMiddleware.filter((def) => def.stage === "authenticate").map((def) => def.fn(contextFromOptions)),
    ...gqlMiddleware.filter((def) => def.stage === "before-response").map((def) => def.fn(contextFromOptions))
  ]);

  // Redirect for graphql-alpha route
  app.all("/graphql-alpha", (req, res) => {
    // Redirect to path once graphql-alpha is received
    res.redirect(path);
  });

  if (ENABLE_RESPONSE_CACHE) {
    app.all("/graphql-beta", async (req, res, next) => {
      try {
        const operationName = req.body.operationName
        if (whitelistCacheOperationName.includes(operationName)) {
          const key = md5(JSON.stringify({ 
            operationName: req.body.operationName,  
            query: req.body.query,
            variables: req.body.variables
           }))
          const cachedResponse = await CacheContents.rawCollection().findOne({ key })
          
          if (cachedResponse) {
            return res.status(200).send(cachedResponse.response)
          }
        }
        
        next()
      } catch (err) {
        // if error occured it occured due to cache query search
        // if error occurs go back to apollo default handling
        console.error(err)
        next()
      }
    })
  }

  apolloServer.applyMiddleware({ app, cors: true, path });

  return {
    apolloServer,
    expressApp: app,
    path
  };
}
