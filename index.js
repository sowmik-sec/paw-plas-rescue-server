const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pets",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage: storage });

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

    // middlewares
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "6h",
      });
      res.send({ token });
    });

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
    // upload image to claudinary
    app.post("/add-pet", upload.single("pet_image"), async (req, res) => {
      const {
        pet_name,
        pet_age,
        pet_category,
        pet_location,
        pet_description,
        posted_date,
        owner_info,
      } = req.body;

      // Ensure that an image was uploaded
      if (!req.file) {
        return res.status(400).send({ message: "Image file is required" });
      }

      const imgUrl = req?.file?.path;
      const pet = {
        pet_image: imgUrl,
        pet_name,
        pet_category,
        pet_age,
        pet_location,
        posted_date,
        pet_description,
        owner_info,
      };
      const result = await petCollection.insertOne(pet);
      res.status(200).send(result);
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
    // app.get("/pets", async (req, res) => {
    //   let { page = 1, limit = 10, category } = req.query;
    //   page = parseInt(page);
    //   limit = parseInt(limit);
    //   const skip = (page - 1) * limit;
    //   let query = {};
    //   if (category !== "all") {
    //     query = { pet_category: category };
    //   }
    //   const totalPets = await petCollection.countDocuments(query);
    //   const pets = await petCollection
    //     .find(query)
    //     .skip(skip)
    //     .limit(limit)
    //     .toArray();
    //   res.status(200).send({
    //     pets,
    //     totalPages: Math.ceil(totalPets / limit),
    //     currentPage: page,
    //   });
    // });
    app.get("/pets", async (req, res) => {
      let { page = 1, limit = 10, category } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;

      let matchQuery = {}; // Initialize the query for category filtering
      if (category !== "all") {
        matchQuery = { pet_category: category };
      }
      const pets = await petCollection
        .aggregate([
          {
            $match: matchQuery,
          },
          {
            $lookup: {
              from: "petRequests",
              let: { petId: { $toString: "$_id" } }, // convert pet _id to string
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$pet_id", "$$petId"] }, // Match with pet_id in petRequests
                  },
                },
              ],
              as: "requestDetails", // store the request details
            },
          },
          {
            $match: {
              requestDetails: { $size: 0 }, // only include pets without requests
            },
          },
          {
            $skip: skip, // pagination: skip documents for current page
          },
          {
            $limit: limit, // limit the number of documents returned
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
            },
          },
        ])
        .toArray();

      const totalPets = await petCollection
        .aggregate([
          {
            $match: matchQuery,
          },
          {
            $lookup: {
              from: "petRequests",
              let: { petId: { $toString: "$_id" } },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$pet_id", "$$petId"] },
                  },
                },
              ],
              as: "requestDetails",
            },
          },
          {
            $match: {
              requestDetails: { $size: 0 }, // only count pets without requests
            },
          },
          {
            $count: "totalPets", // count the total number of pets
          },
        ])
        .toArray();
      const totalPetCount = totalPets[0]?.totalPets || 0;
      res.status(200).send({
        pets,
        totalPages: Math.ceil(totalPetCount / limit),
        currentPage: page,
      });
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
