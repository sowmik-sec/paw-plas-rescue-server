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
    const successStoryCollection = client
      .db("pawPalsRescue")
      .collection("successStories");
    const petCategoryCollection = client
      .db("pawPalsRescue")
      .collection("petCategories");

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
    app.get("/pet-categories", async (req, res) => {
      const result = await petCategoryCollection.find().toArray();
      res.send(result);
    });
    app.get("/success-stories", async (req, res) => {
      const result = await successStoryCollection.find().toArray();
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
