const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const conf = require("./config");
const morgan = require("morgan");
const { verifySignUp } = require("./middlewares/index");
// const Log = require("./models/log");
const app = express();
const expressip = require("express-ip");
app.use(expressip().getIpInfoMiddleware);
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const path = require('path');
const sharp = require('sharp');

const db = {};

db.mongoose = mongoose;

app.use(cors());

// parse requests of content-type - application/json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
// Define a custom Morgan token to log the required information
/*morgan.token('custom', (req, res) => {
  //console.log(req.originalUrl+"("+req.method+")"+);
  return JSON.stringify({
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${res.getHeader('x-response-time')}ms`,
  });
});*/

// Log HTTP requests using Morgan with the custom token
app.use(morgan('dev'));

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});
/*app.use('/uploads', async (req, res, next) => {
  const imagePath = path.join(__dirname, 'uploads', req.url);

  try {
    // Check if the request is for an image (you can enhance this check as needed)
    if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg') || req.url.endsWith('.png')) {
      const compressedImage = await sharp(imagePath)
        .resize({ width: 800, height: 600 }) // Adjust dimensions as needed
        .toBuffer();

      res.set('Content-Type', 'image/jpeg'); // Adjust the content type as needed
      res.send(compressedImage);
    } else {
      // Serve non-image files as-is
      next();
    }
  } catch (error) {
    console.error(error);
    next();
  }
});
*/

app.use("/uploads", express.static("uploads"));
// parse requests of content-type - application/x-www-form-urlencoded
//app.use(bodyParser.urlencoded({ extended: true }));
db.mongoose
  .connect(conf.dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

//ROUTES CALLNG
// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Gym pair API." });
});

app.use("/", require("./controllers/MISC"));
app.use("/auth", require("./controllers/auth"));
app.use("/user", require("./controllers/user"));
app.use("/gym", require("./controllers/gym"));
app.use("/feed", require("./controllers/feed"));
app.use("/match", require("./controllers/match"));
app.use("/chat", require("./controllers/chat"));
app.use("/gmail", require("./controllers/gmailAuth"));
app.use("/rewards", require("./controllers/rewards"));
app.use("/workout", require("./controllers/workout"));
app.use("/admin", require("./controllers/admin"));
app.use("/customer_support", require("./controllers/support"));
app.use("/calculator", require("./controllers/calculator"));
app.use("/package", require("./controllers/package"));
app.use("/inAppPurchase", require("./controllers/inAppPurchase"));
app.use("/story", require("./controllers/story"));
app.use("/coupon", require("./controllers/coupon"));
app.use("/coupon-redeem", require("./controllers/couponRedeem"));

// set port, listen for requests
const PORT = process.env.PORT || conf.apiPort;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
