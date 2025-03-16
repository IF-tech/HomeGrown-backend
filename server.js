const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { Pool } = require("pg");
require("dotenv").config();

const cors = require("cors");

const pool = new Pool({
   user: process.env.DB_USER_TEST,
   host: process.env.DB_HOST_TEST,
   database: process.env.DB_NAME_TEST,
   password: process.env.DB_PASSWORD_TEST,
   port: process.env.DB_PORT || 5432,
   ssl: {
      rejectUnauthorized: false,
   },
});

pool
   .connect()
   .then(() => console.log("✅ Successfully connected to the database"))
   .catch((err) => console.error("❌ Database connection error:", err));

const typeDefs = gql`
   type Product {
      id: ID!
      name: String!
      availability: Boolean!
      quantity: Int!
      price: Float!
      pictures: [String!]
   }

   type Farm {
      id: ID!
      farmName: String!
      ownerName: String!
      address: String!
      latitude: Float!
      longitude: Float!
      pictures: [String!]
      description: String
      tags: [String!]
      ratings: Float
      products: [Product!]
   }

   input ProductInput {
      name: String!
      availability: Boolean!
      quantity: Int!
      price: Float!
      pictures: [String!]
   }

   input FarmInput {
      farmName: String!
      ownerName: String!
      address: String!
      latitude: Float!
      longitude: Float!
      pictures: [String!]
      description: String
      tags: [String!]
      ratings: Float
      products: [ProductInput!]
   }

   type Query {
      hello: String
      getFarm(id: ID!): Farm
      getAllFarms: [Farm!]
   }

   type Mutation {
      createFarm(input: FarmInput!): Farm
      updateFarm(id: ID!, input: FarmInput!): Farm
      deleteFarm(id: ID!): Boolean
   }
`;

// Define your resolvers
const resolvers = {
   Query: {
      hello: () => "Hello, world!",
      getFarm: async (_, { id }) => {
         const query = 'SELECT id, farmname AS "farmName", ownername AS "ownerName", address, latitude, longitude, pictures, description, tags, ratings FROM farms WHERE id = $1'; // Use $1 for parameterized query
         const values = [id]; // Pass the id as a parameter
         try {
           const result = await pool.query(query, values);
           if (result.rows.length === 0) {
             throw new Error("Farm not found");
           }
           console.log(result.rows[0])
           return result.rows[0];
         } catch (err) {
           console.error("Error fetching farm:", err);
           throw new Error("Failed to fetch farm");
         }
       },
      getAllFarms: async () => {
         const query =
            'SELECT id, farmname AS "farmName", ownername AS "ownerName", address, latitude, longitude, pictures, description, tags, ratings FROM farms';
         const result = await pool.query(query);
         console.log(result.rows);
         return result.rows;
      },
   },
   Mutation: {
      createFarm: async (_, { input }) => {
         const {
            farmName,
            ownerName,
            address,
            latitude,
            longitude,
            pictures,
            description,
            tags,
            ratings,
            products,
         } = input;

         // Insert farm into the farms table
         const farmQuery = `
            INSERT INTO farms (farmName, ownerName, address, latitude, longitude, pictures, description, tags, ratings)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`;
         const farmValues = [
            farmName,
            ownerName,
            address,
            latitude,
            longitude,
            pictures,
            description,
            tags,
            ratings,
         ];
         const farmResult = await pool.query(farmQuery, farmValues);
         const farm = farmResult.rows[0];

         // Insert products into the products table
         if (products && products.length > 0) {
            for (const product of products) {
               const { name, availability, quantity, price, pictures } =
                  product;
               const productQuery = `
                  INSERT INTO products (farmId, name, availability, quantity, price, pictures)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  RETURNING *`;
               const productValues = [
                  farm.id,
                  name,
                  availability,
                  quantity,
                  price,
                  pictures,
               ];
               await pool.query(productQuery, productValues);
            }
         }

         return farm;
      },
      updateFarm: async (_, { id, input }) => {
         const {
            farmName,
            ownerName,
            address,
            latitude,
            longitude,
            pictures,
            description,
            tags,
            ratings,
            products,
         } = input;

         // Update farm in the farms table
         const farmQuery = `
            UPDATE farms
            SET farmName = $1, ownerName = $2, address = $3, latitude = $4, longitude = $5, pictures = $6, description = $7, tags = $8, ratings = $9
            WHERE id = $10
            RETURNING *`;
         const farmValues = [
            farmName,
            ownerName,
            address,
            latitude,
            longitude,
            pictures,
            description,
            tags,
            ratings,
            id,
         ];
         const farmResult = await pool.query(farmQuery, farmValues);
         const farm = farmResult.rows[0];

         // Update products in the products table
         if (products && products.length > 0) {
            for (const product of products) {
               const {
                  id: productId,
                  name,
                  availability,
                  quantity,
                  price,
                  pictures,
               } = product;
               const productQuery = `
                  UPDATE products
                  SET name = $1, availability = $2, quantity = $3, price = $4, pictures = $5
                  WHERE id = $6 AND farmId = $7
                  RETURNING *`;
               const productValues = [
                  name,
                  availability,
                  quantity,
                  price,
                  pictures,
                  productId,
                  farm.id,
               ];
               await pool.query(productQuery, productValues);
            }
         }

         return farm;
      },
      deleteFarm: async (_, { id }) => {
         // Delete products associated with the farm
         await pool.query("DELETE FROM products WHERE farmId = $1", [id]);

         // Delete the farm
         await pool.query("DELETE FROM farms WHERE id = $1", [id]);

         return true;
      },
   },
};

// Create an Express app
const app = express();
app.use(cors());
app.use(cors({
   origin: "exp://192.168.1.253:8081", // Replace with your frontend URL
   credentials: true,
 }));

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

const PORT = 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready at http://0.0.0.0:${PORT}${server.graphqlPath}`);
});
}

// Call the startServer function
startServer().catch((err) => {
   console.error("Error starting server:", err);
});
