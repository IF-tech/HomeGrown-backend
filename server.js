const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { Pool } = require("pg");

// Define your GraphQL schema
const typeDefs = gql`
   type Query {
      hello: String
   }
`;

// Define your resolvers
const resolvers = {
   Query: {
      hello: () => "Hello, world!",
   },
};

// Create an Express app
const app = express();

// Create an Apollo Server instance
const server = new ApolloServer({
   typeDefs,
   resolvers,
});

// Function to start the server
async function startServer() {
   // Start the Apollo Server
   await server.start();

   // Apply Apollo Server middleware to Express
   server.applyMiddleware({ app });

   // Start the Express server
   const PORT = 4000;
   app.listen({ port: PORT }, () => {
      console.log(
         `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
      );
   });
}

// Call the startServer function
startServer().catch((err) => {
   console.error("Error starting server:", err);
});
