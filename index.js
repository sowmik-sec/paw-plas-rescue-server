const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
var cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xgh8h2c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("pawPalsRescue").collection("users");
    const petCollection = client.db("pawPalsRescue").collection("pets");
    const petRequestCollection = client
      .db("pawPalsRescue")
      .collection("petRequests");
    const successStoryCollection = client
      .db("pawPalsRescue")
      .collection("successStories");
    const petCategoryCollection = client
      .db("pawPalsRescue")
      .collection("petCategories");
    // save user to db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExists = await userCollection.findOne(query);
      if (isExists) {
        return res.send({ message: "User already exists", insertedId: null });
      } else {
        const result = await userCollection.insertOne(user);
        res.send(result);
      }
    });
    // pet categories
    app.get("/pet-categories", async (req, res) => {
      const result = await petCategoryCollection.find().toArray();
      res.send(result);
    });
    // success story related api
    app.get("/success-stories", async (req, res) => {
      const result = await successStoryCollection.find().toArray();
      res.send(result);
    });
    app.get("/stories/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await successStoryCollection.findOne(query);
      res.send(result);
    });
    // getting pet(s) related api
    app.get("/pets", async (req, res) => {
      const category = req.query.category;
      if (category !== "all") {
        const query = { pet_category: category };
        const result = await petCollection.find(query).toArray();
        res.send(result);
      } else {
        const result = await petCollection.find().toArray();
        res.send(result);
      }
    });
    app.get("/pets/details/:id", async (req, res) => {
      const petId = req.params.id;
      const petDetails = await petCollection
        .aggregate([
          {
            $match: { _id: new ObjectId(petId) }, // Find the specific pet by its _id
          },
          {
            // Ensure the petRequests.pet_id is converted to ObjectId for the lookup
            $lookup: {
              from: "petRequests", // The collection to join with
              let: { pet_id: "$_id" }, // Pass the _id from the pet document to the next stage
              pipeline: [
                {
                  $addFields: {
                    pet_id: { $toObjectId: "$pet_id" }, // Convert petRequests.pet_id to ObjectId
                  },
                },
                {
                  $match: {
                    $expr: {
                      $eq: ["$pet_id", "$$pet_id"], // Match the converted pet_id with the pet _id
                    },
                  },
                },
              ],
              as: "requestDetails", // Output array field where the joined documents will be stored
            },
          },
          {
            $unwind: {
              path: "$requestDetails", // Unwind the array to show a single result if a match is found
              preserveNullAndEmptyArrays: true, // Keep pet details even if no requests are found
            },
          },
          {
            $project: {
              _id: 1,
              pet_name: 1,
              pet_image: 1,
              pet_category: 1,
              pet_age: 1,
              pet_location: 1,
              posted_date: 1,
              pet_description: 1,
              owner_info: 1,
              "requestDetails.status": 1,
              "requestDetails.request_date": 1,
              "requestDetails.requester_info.name": 1,
              "requestDetails.requester_info.address": 1,
            },
          },
        ])
        .toArray();

      if (petDetails.length === 0) {
        return res.status(404).json({ message: "Pet not found" });
      }
      res.status(200).send(petDetails[0]);
    });
    // adoption related api
    app.post("/pet-request", async (req, res) => {
      const info = req.body;
      const result = await petRequestCollection.insertOne(info);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Paw pals rescue is running!");
});
app.listen(port, () => {
  console.log(`Paw pals rescue server is listening on port ${port}`);
});
