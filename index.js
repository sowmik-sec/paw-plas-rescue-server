const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const donationCollection = client
      .db("pawPalsRescue")
      .collection("donations");
    const donationCampaignCollection = client
      .db("pawPalsRescue")
      .collection("donationCampaigns");
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
        owner_info: JSON.parse(owner_info),
      };
      const result = await petCollection.insertOne(pet);
      res.status(200).send(result);
    });

    // update a pet
    app.put("/update-pet/:id", upload.single("pet_image"), async (req, res) => {
      const { id } = req.params;
      const {
        pet_name,
        pet_age,
        pet_category,
        pet_location,
        pet_description,
        posted_date,
        owner_info,
      } = req.body;

      // Find the existing pet in the collection
      const existingPet = await petCollection.findOne({
        _id: new ObjectId(id),
      });
      if (!existingPet) {
        return res.status(404).send({ message: "Pet not found" });
      }

      let imgUrl = existingPet.pet_image; // Use the existing image by default

      // If a new image is uploaded, upload it to Cloudinary
      if (req.file) {
        try {
          // Upload new image to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "pets",
          });
          imgUrl = uploadResult.secure_url; // Set the new image URL
        } catch (error) {
          return res.status(500).send({ message: "Error uploading image" });
        }
      }

      // Prepare the updated pet object
      const updatedPet = {
        pet_image: imgUrl,
        pet_name,
        pet_category,
        pet_age,
        pet_location,
        posted_date,
        pet_description,
        owner_info: JSON.parse(owner_info),
      };

      // Update the pet in the collection
      const result = await petCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedPet }
      );

      if (result.modifiedCount > 0) {
        res.status(200).send(result);
      } else {
        res.status(500).send({ message: "Failed to update pet" });
      }
    });

    // create donation campaign
    app.post(
      "/create-donation-campaign",
      upload.single("pet_image"),
      async (req, res) => {
        const {
          pet_name,
          max_donation,
          last_date,
          short_description,
          long_description,
          donation_created_at,
          creator_info,
        } = req.body;

        try {
          let petImageUrl = null;

          // If a file is uploaded, upload it to Cloudinary and get the URL
          if (req.file) {
            const cloudinaryUploadResponse = await cloudinary.uploader.upload(
              req.file.path
            );
            petImageUrl = cloudinaryUploadResponse.secure_url;
          }

          const newCampaign = {
            pet_name,
            max_donation,
            last_date,
            short_description,
            long_description,
            pet_image: petImageUrl,
            donation_created_at,
            creator_info: JSON.parse(creator_info),
          };

          const result = await donationCampaignCollection.insertOne(
            newCampaign
          );
          res.status(200).send({ insertedId: result.insertedId });
        } catch (error) {
          console.error("Error creating donation campaign:", error);
          res.status(500).send({ message: "Error creating campaign" });
        }
      }
    );

    // get donation campaigns
    app.get("/donation-campaigns", async (req, res) => {
      let { page = 1, limit = 10 } = req.query;
      console.log(req.query);
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;
      const totalCampaigns = await donationCampaignCollection.countDocuments();

      const campaigns = await donationCampaignCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();
      res.status(200).send({
        campaigns,
        totalPages: Math.ceil(totalCampaigns / limit),
        currentPage: page,
      });
    });
    // get single donation campaign
    app.get("/donation-campaign/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await donationCampaignCollection.findOne(query);
      res.send(result);
    });

    // get my pets
    app.get("/my-pets", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const myPets = await petCollection
        .aggregate([
          // Match pets added by the owner (email)
          {
            $match: {
              "owner_info.email": email,
            },
          },
          // Perform lookup to get request details from petRequests collection
          {
            $lookup: {
              from: "petRequests", // The collection to join with
              let: { petId: "$_id" }, // petId is from the pets collection
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [{ $toString: "$pet_id" }, { $toString: "$$petId" }], // Match pet_id in requests to _id in pets, both converted to strings
                    },
                  },
                },
              ],
              as: "requestDetails", // Output array field
            },
          },
          // Optionally unwind the requestDetails to get each request as an individual document
          {
            $unwind: {
              path: "$requestDetails", // Unwind the array
              preserveNullAndEmptyArrays: true, // Keep the pets even if no requests are found
            },
          },
          // Project the desired fields
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
              "owner_info.name": 1,
              "owner_info.email": 1,
              "requestDetails.status": 1, // Include the request status if available
              "requestDetails.request_date": 1, // Include request date if available
            },
          },
        ])
        .toArray();

      res.status(200).json(myPets);
    });

    // make pet adopted
    app.patch("/make-adopted/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { pet_id: id };
      const updateDoc = {
        $set: {
          status: "adopted",
        },
      };
      const result = await petRequestCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/delete-pet/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
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

    // donation related apis
    app.post("/create-donation-intent", async (req, res) => {
      const { donation } = req.body;
      const amount = parseInt(donation) * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/donations", async (req, res) => {
      const donation = req.body;
      const donationResult = await donationCollection.insertOne(donation);
      res.send({ donationResult });
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
