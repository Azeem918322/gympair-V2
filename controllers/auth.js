var express = require("express");
var router = express.Router();
const config = require("../config");
const db = require("../models");
var async = require("async");
const User = db.user;
const Gym = db.gym;
const Wallet = db.wallet;
const TransactionDB = db.transaction;
const Notification = db.notification;
var fs = require("fs");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const axios = require("axios").default;
const { SG, mailSender, apiUrl, secret } = require("../config.js");
const { verifyToken } = require("../middlewares/verifyToken");
const { verifySignUp } = require("../middlewares/signup");
const { trackUsers, validDevice } = require("../middlewares/trackUsers");
const { validate } = require("express-validation");
const multer = require("multer");
const request = require("request");
var path = require("path");

var Storage = multer.diskStorage({
  //multers disk storage settings
  destination: function (req, file, cb) {
    var dir = "./uploads";
    fs.exists(dir, (exist) => {
      if (exist) {
        cb(null, dir);
      } else {
        fs.mkdir(dir, (error) => {
          if (!error) {
            cb(null, dir);
          }
        });
      }
    });
  },
  filename: function (req, file, cb) {
    var datetimestamp = Date.now();
    var seq = Math.floor(Math.random() * 9000000);
    var imgName =
      "dp_" +
      file.originalname.split(".")[0] +
      "-" +
      seq +
      "." +
      file.originalname.split(".")[file.originalname.split(".").length - 1];

    cb(null, imgName);
  },
});
var upload = multer({
  //multer settings
  storage: Storage,
}).single("profile_picture");
router.post("/register", function (req, res) {
  //console.log(req.body);
  upload(req, res, function (e, f) {
    const validationString = req.body.workout.replace(/\b(\w+)\b/g, '"$1"');
    const jsonObject = JSON.parse(validationString);

    const workout = {
      workout_type: jsonObject.workout_type,
      days: jsonObject.days,
      time: jsonObject.time,
    };

    const user = new User({
      firstName:
        req.body.firstName && req.body.firstName != "string"
          ? req.body.firstName
          : "",
      lastName:
        req.body.lastName && req.body.lastName != "string"
          ? req.body.lastName
          : "",
      username: req.body.username,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email.toLowerCase(),
      password: bcrypt.hashSync(req.body.password, 8),
      referal_code: req.body.referal_code ? req.body.referal_code : null,
      vaccinated: req.body.vaccinated ? req.body.vaccinated : false,
      date_of_birth: req.body.date_of_birth ? req.body.date_of_birth : "",
      height: req.body.height ? req.body.height : 0,
      typeHeight:
        req.body.height && req.body.typeHeight ? req.body.typeHeight : "cm",
      typeWeight:
        req.body.weight && req.body.typeWeight ? req.body.typeWeight : "kg",
      weight: req.body.weight ? req.body.weight : 0,
      workout: req.body.workout ? workout : {},
      gender: req.body.gender ? req.body.gender : "male",
      /*"latitude": req.body.latitude ? req.body.latitude : 0,
            "longitude": req.body.longitude ? req.body.longitude : 0,
            */
      profile_picture: req.file
        ? config.apiUrl + "/uploads/" + req.file.filename
        : "",
      introduction: req.body.introduction ? req.body.introduction : "",
      interests: req.body.interests ? req.body.interests : [],
      /*"gym": req.body.gym_name ? [req.body.gym] : [],
            "gym_updated_at": req.body.gym ? new Date() : '',
            */ //"isGymMember": req.body.isGymMember ? req.body.isGymMember : false,
      subscription: 0,
      canChangeGym: req.body.canChangeGym ? req.body.canChangeGym : false,
      //"canChangeStation": req.body.canChangeStation ? req.body.canChangeStation : false
    });

    user.save((err, usr) => {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        var dt = new Date();
        req.userId = user._id;
        //save gym or station info
        saveGym(req.body, user._id);
        //save 10 points to wallet
        addWallet(user._id);
        var minm = 100000;
        var maxm = 999999;
        var seq = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
        user["otp"] = seq;
        user["otp_created_at"] = dt.setHours(dt.getHours() + 1);

        user.save();
        if (req.body.referal_code) {
          handleReferal(req.body.referal_code);
        }
        var OTPtext =
          "Your Fitpair verification OTP is: " +
          seq +
          "\n" +
          "Do not share this with anyone. ";
        var url =
          "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
          req.body.phoneNumber +
          "&message=" +
          OTPtext;

        request(url, (error, response, body) => {
          if (error) {
            console.log(error);
            return res.json(body);
          } else {
            var token = jwt.sign({ user: user._id }, config.secret, {
              expiresIn: "365d", // 24 hours
            });
            res.status(200).json({
              status: true,
              message:
                "User created successfully.We have sent OTP to your mobile Number.",
              token: token,
            });
          }
        });
      }
    });
  });
});

router.post("/register/google", function (req, res) {
  // console.log(req.body);
  upload(req, res, function (e, f) {
    //console.log(JSON.parse(JSON.stringify(req.body.workout)));
    //console.log(JSON.parse(req.body.workout));

    const validationString = req.body.workout.replace(/\b(\w+)\b/g, '"$1"');
    const jsonObject = JSON.parse(validationString);

    const workout = {
      workout_type: jsonObject.workout_type,
      days: jsonObject.days,
      time: jsonObject.time,
    };
    //console.log(workout);
    const user = new User({
      firstName:
        req.body.firstName && req.body.firstName != "string"
          ? req.body.firstName
          : "",
      lastName:
        req.body.lastName && req.body.lastName != "string"
          ? req.body.lastName
          : "",
      username: req.body.username,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email.toLowerCase(),
      // "password": bcrypt.hashSync(req.body.password, 8),
      referal_code: req.body.referal_code ? req.body.referal_code : null,
      vaccinated: req.body.vaccinated ? req.body.vaccinated : false,
      date_of_birth: req.body.date_of_birth ? req.body.date_of_birth : "",
      height: req.body.height ? req.body.height : 0,
      typeHeight:
        req.body.height && req.body.typeHeight ? req.body.typeHeight : "cm",
      typeWeight:
        req.body.weight && req.body.typeWeight ? req.body.typeWeight : "kg",
      weight: req.body.weight ? req.body.weight : 0,
      workout: req.body.workout ? workout : {},
      gender: req.body.gender ? req.body.gender : "",
      profile_picture: req.file
        ? config.apiUrl + "/uploads/" + req.file.filename
        : "",
      introduction: req.body.introduction ? req.body.introduction : "",
      gym: req.body.title ? [req.body.gym] : [],
      interests: req.body.interests ? req.body.interests : [],
      gym_updated_at: req.body.title ? new Date() : "",
      isGymMember: req.body.isGymMember ? req.body.isGymMember : false,
      canChangeGym: req.body.canChangeGym ? req.body.canChangeGym : false,
      canChangeStation: req.body.canChangeStation
        ? req.body.canChangeStation
        : false,
      social_token: req.body.social_token ? req.body.social_token : "",
      social_id: req.body.social_id ? req.body.social_id : "",
      is_social: true,
    });

    user.save((err, usr) => {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        var dt = new Date();
        req.userId = user._id;
        /*upload(req, res, function(err, f) {
                    console.log(req.file);

                })*/
        var minm = 100000;
        var maxm = 999999;
        var seq = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
        //var seq = Math.floor(Math.random() * 9000000);
        user["otp"] = seq;
        user["otp_created_at"] = dt.setHours(dt.getHours() + 1);

        user.save();
        if (req.body.referal_code) {
          handleReferal(req.body.referal_code);
        }
        saveGym(req.body, user._id);
        addWallet(user._id);
        console.log(req.body.phoneNumber);
        var OTPtext =
          "Your Fitpair verification OTP is: " +
          seq +
          "\n" +
          "Do not share this with anyone. ";
        var url =
          "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
          req.body.phoneNumber +
          "&message=" +
          OTPtext;

        request(url, (error, response, body) => {
          if (error) {
            console.log(error);
            return res.json(body);
          } else {
            var token = jwt.sign({ user: user._id }, config.secret, {
              expiresIn: "365d", // 24 hours
            });
            res.status(200).json({
              status: true,
              message:
                "User created successfully.We have sent OTP to your mobile Number.",
              token: token,
            });
          }
        });
      }
    });
  });
});

router.post("/register/apple", function (req, res) {
  upload(req, res, function (e, f) {
    const validationString = req.body.workout.replace(/\b(\w+)\b/g, '"$1"');
    const jsonObject = JSON.parse(validationString);

    const workout = {
      workout_type: jsonObject.workout_type,
      days: jsonObject.days,
      time: jsonObject.time,
    };

    const user = new User({
      firstName:
        req.body.firstName && req.body.firstName != "string"
          ? req.body.firstName
          : "",
      lastName:
        req.body.lastName && req.body.lastName != "string"
          ? req.body.lastName
          : "",
      username: req.body.username,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email.toLowerCase(),
      //"password": bcrypt.hashSync(req.body.password, 8),
      referal_code: req.body.referal_code ? req.body.referal : "",
      vaccinated: req.body.vaccinated ? req.body.vaccinated : false,
      date_of_birth: req.body.date_of_birth ? req.body.date_of_birth : "",
      height: req.body.height ? req.body.height : 0,
      typeHeight:
        req.body.height && req.body.typeHeight ? req.body.typeHeight : "cm",
      typeWeight:
        req.body.weight && req.body.typeWeight ? req.body.typeWeight : "kg",
      weight: req.body.weight ? req.body.weight : 0,
      workout: req.body.workout ? workout : {},
      gender: req.body.gender ? req.body.gender : "",
      //"latitude": req.body.latitude ? req.body.latitude : 0,
      //"longitude": req.body.longitude ? req.body.longitude : 0,
      profile_picture: req.file
        ? config.apiUrl + "/uploads/" + req.file.filename
        : "",
      interests: req.body.interests ? req.body.interests : [],
      introduction: req.body.introduction ? req.body.introduction : "",
      //"gym_name": req.body.gym_name ? req.body.gym_name : '',
      //"gym_address": req.body.gym_address ? req.body.gym_address : '',
      gym_updated_at: req.body.title ? new Date() : "",
      //"station_latitude": req.body.station_latitude ? req.body.station_latitude : 0,
      //"station_longitude": req.body.station_longitude ? req.body.station_longitude : 0,
      //"station_name": req.body.station_name ? req.body.station_name : '',
      isGymMember: req.body.isGymMember ? req.body.isGymMember : false,
      canChangeGym: req.body.canChangeGym ? req.body.canChangeGym : false,
      canChangeStation: req.body.canChangeStation
        ? req.body.canChangeStation
        : false,
      social_token: req.body.social_token ? req.body.social_token : "",
      social_id: req.body.social_id ? req.body.social_id : "",
      is_social: true,
    });

    user.save((err, usr) => {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        var dt = new Date();
        req.userId = user._id;
        /*upload(req, res, function(err, f) {
                    console.log(req.file);

                })*/
        var minm = 100000;
        var maxm = 999999;
        var seq = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
        //var seq = Math.floor(Math.random() * 9000000);
        user["otp"] = seq;
        user["otp_created_at"] = dt.setHours(dt.getHours() + 1);

        user.save();
        if (req.body.referal_code) {
          handleReferal(req.body.referal_code);
        }
        saveGym(req.body, user._id);
        addWallet(user._id);
        var OTPtext =
          "Your Fitpair verification OTP is: " +
          seq +
          "\n" +
          "Do not share this with anyone. ";
        var url =
          "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
          req.body.phoneNumber +
          "&message=" +
          OTPtext;

        request(url, (error, response, body) => {
          if (error) {
            return res.json(body);
          } else {
            var token = jwt.sign({ user: user._id }, config.secret, {
              expiresIn: "365d", // 24 hours
            });
            res.status(200).json({
              status: true,
              message:
                "User created successfully.We have sent OTP to your mobile Number.",
              token: token,
            });
          }
        });
      }
    });
  });
});

router.post("/login", function (req, res) {
  //console.log(req.body);
  if (req.body.token) {
    User.findOne({ token: req.body.token }).exec(function (err, user) {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        if (user) {
          if (user.otp && user.otp !== 0) {
            var seq = Math.floor(Math.random() * 900000);
            var dt = new Date();
            user["otp"] = seq;
            user["otp_created_at"] = dt.setHours(dt.getHours() + 1);
            user.save();
            var OTPtext =
              "Welcome to fitpair. Your Fitpair verification OTP is: " +
              seq +
              "\n" +
              "Do not share this with anyone. ";
            var url =
              "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
              req.body.phoneNumber +
              "&message=" +
              OTPtext;

            request(url, (error, response, body) => {
              if (error) {
                console.log(error);
                return res.json(body);
              }
            });
            var token = jwt.sign({ user: user._id }, config.secret, {
              expiresIn: "24h", // 24 hours
            });
            res.status(403).json({
              status: false,
              phoneNumber: user.phoneNumber,
              code: 987,
              message: "We have sent OTP to your mobile Number.",
              token: token,
            });
          } else {
            var token = jwt.sign({ user: user._id }, config.secret, {
              expiresIn: "365d", // 24 hours
            });
            user = user.toObject();
            delete user["password"];
            delete user["otp_created_at"];
            delete user["otp"];
            var lastDate = new Date().toISOString();
            User.updateOne(
              { _id: user["_id"] },
              { $set: { last_login: lastDate } }
            ).exec(function (err, up) {
              if (err) {
                console.log(err);
              } else {
                res.status(200).json({
                  status: true,
                  message: "User Logged In Successfully.",
                  token: token,
                  data: user,
                });
              }
            });
          }
        } else {
          return res
            .status(404)
            .send({ message: "Unauthorized.User Doesn't exist." });
        }
      }
    });
  } else {
    User.findOne({ email: req.body.email.toLowerCase() }).exec(function (
      err,
      user
    ) {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        if (user) {
          //console.log(user);
          if (user.otp && user.otp !== 0) {
            var seq = Math.floor(Math.random() * 900000);
            var dt = new Date();
            user["otp"] = seq;
            user["otp_created_at"] = dt.setHours(dt.getHours() + 1);
            user.save();
            //console.log(user.phoneNumber);
            var OTPtext =
              "Welcome to fitpair. Your Fitpair verification OTP is: " +
              seq +
              "\n" +
              "Do not share this with anyone. ";
            var url =
              "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
              user.phoneNumber +
              "&message=" +
              OTPtext;

            request(url, (error, response, body) => {
              if (error) {
                console.log(error);
                return res.json(body);
              }
            });
            var token = jwt.sign({ user: user._id }, config.secret, {
              expiresIn: "365d", // 24 hours
            });
            res.status(403).json({
              status: false,
              phoneNumber: user.phoneNumber,
              code: 987,
              message: "We have sent OTP to your mobile Number.",
              token: token,
            });
          } else {
            if (user.password) {
              bcrypt.compare(
                req.body.password,
                user.password,
                function (error, isMatch) {
                  if (error) {
                    console.log(error);
                    res
                      .status(500)
                      .send({ status: false, code: 500, message: error });
                    return;
                  } else if (isMatch) {
                    var token = jwt.sign({ user: user._id }, config.secret, {
                      expiresIn: "365d", // 24 hours
                    });
                    user = user.toObject();
                    delete user["password"];
                    delete user["otp_created_at"];
                    delete user["otp"];
                    var lastDate = new Date().toISOString();
                    User.updateOne(
                      { _id: user["_id"] },
                      { $set: { last_login: lastDate } }
                    ).exec(function (err, up) {
                      if (err) {
                        console.log(err);
                      } else {
                        res.status(200).json({
                          status: true,
                          message: "User Logged In Successfully.",
                          token: token,
                          data: user,
                        });
                      }
                    });
                  } else {
                    res.status(500).send({
                      status: false,
                      code: 500,
                      message: "Password Doesn't Match.",
                    });
                    return;
                  }
                }
              );
            } else {
              return res.status(401).send({ message: "Login Failed." });
            }
          }
        } else {
          return res
            .status(401)
            .send({ message: "Unauthorized.User Doesn't exist." });
        }
      }
    });
  }
});

router.post("/add-device", [verifyToken], function (req, res) {
  // Remove all previous notificationTokens for the current user
  User.updateOne(
    { _id: req.userId },
    { $set: { notificationToken: [] } },
    function (err, result) {
      if (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err });
      }

      // Add the new notificationToken for the current user
      User.updateOne(
        { _id: req.userId },
        { $addToSet: { notificationToken: req.body.notificationToken } },
        {
          runValidators: true,
          new: true,
        },
        function (e, u) {
          if (e) {
            console.log(e);
            return res.status(500).json({ status: false, message: e });
          }
          return res
            .status(200)
            .json({ status: true, message: "Device updated successfully" });
        }
      );
    }
  );
});

// router.post('/add-device', [verifyToken], function(req, res) {
//     User.updateOne({ _id: req.userId }, { $addToSet: { 'notificationToken': req.body.notificationToken } }, {
//         runValidators: true,
//         new: true,
//     }, function(e, u) {
//         if (e) {
//             console.log(e);
//             res.status(500).json({ status: false, message: e });
//         } else {
//             res.status(200).json({ status: true, message: "Device updated successfully" });
//         }
//     })

/*const options = {
  method: 'POST',
  url: config.OSUrl+'/players',
  headers: {accept: 'application/json', 'Content-Type': 'application/json'},
  data: {
    "app_id": config.appID,
    "device_type": req.body.device_type,
    "device_model": req.body.device_model,
    "device_os": req.body.device_os,
    "external_user_id":req.body.external_user_id,
    "identifier":req.body.identifier
  }
};*/

/*axios
      .request(options)
      .then(function (response) {
        if(response.data.success){
            req.body.deviceID=response.data.id;
            User.findOne({_id:req.body.external_user_id})
            .exec(function(err,device){
                if(err){
                    res.status(500).json({error:err})
                }else{
                    if(device.device_os&&device.device_model&&device.identifier&&device.deviceID){
                        //console.log("update device info");
                    }else{
                        //console.log("add device info");
                        User.updateOne({ _id: req.body.external_user_id }, req.body, {
                                    runValidators: true,
                                    new: true,
                                }, function(e, u) {
                                    if (e) {
                                        res.status(500).json({ status: false, message: e });
                                    } else {
                                        res.status(200).json({ status: true, message: "Device added successfully" });
                                    }
                                })
                    }
                }
            });
        }
      })
      .catch(function (error) {
        res.status(500).json({error:error})
      });*/
// });

router.get("/check-social", function (req, res) {
  let token = req.query.social_token;
  if (token) {
    const decoded = jwt.decode(token);
    if (decoded) {
      User.findOne({ email: decoded.email }).exec(function (err, user) {
        if (err) {
          res.status(500).send({ status: false, code: 500, message: err });
          return;
        } else {
          if (user) {
            if (user.otp && user.otp !== 0) {
              var seq = Math.floor(Math.random() * 900000);
              var dt = new Date();
              user["otp"] = seq;
              user["otp_created_at"] = dt.setHours(dt.getHours() + 1);
              user.save();
              var OTPtext =
                "Welcome to fitpair. Your Fitpair verification OTP is: " +
                seq +
                "\n" +
                "Do not share this with anyone. ";
              var url =
                "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
                req.body.phoneNumber +
                "&message=" +
                OTPtext;

              request(url, (error, response, body) => {
                if (error) {
                  console.log(error);
                  return res.json(body);
                }
              });
              var token = jwt.sign({ user: user._id }, config.secret, {
                expiresIn: "365d", // 24 hours
              });
              res.status(403).json({
                status: false,
                phoneNumber: user.phoneNumber,
                code: 987,
                message: "We have sent OTP to your mobile Number.",
                token: token,
              });
            } else {
              var token = jwt.sign({ user: user._id }, config.secret, {
                expiresIn: "365d", // 24 hours
              });
              user = user.toObject();
              delete user["password"];
              delete user["otp_created_at"];
              delete user["otp"];
              res.status(200).json({
                status: true,
                message: "User Logged In Successfully.",
                token: token,
                data: user,
              });
            }
          } else {
            return res.status(401).send({
              code: 988,
              message: "Unauthorized.User Doesn't exist.",
            });
          }
        }
      });
    } else {
      return res.status(401).send({ message: "Error!" });
    }
  }
});

router.get("/OTP/:otp", function (req, res) {
  var dt = new Date();

  User.findOne({ otp: req.params.otp })
    .select(
      "firstName lastName username email gender phoneNumber otp otp_created_at"
    )
    .exec(function (err, usr) {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        if (usr) {
          if (usr.otp_created_at > dt.getHours()) {
            usr.otp = 0;
            usr.save();
            var token = jwt.sign({ user: usr._id }, config.secret, {
              expiresIn: "365d", // 24 hours
            });
            delete usr._doc.otp;
            delete usr._doc.otp_created_at;
            //email to confirm user a successful registration
            sendEmail({
              email: usr["email"],
              name: usr["firstName"] + " " + usr["lastName"],
            });
            res.status(200).json({
              status: true,
              message: "User Logged in successfully.",
              token: token,
              data: usr,
            });
          } else {
            res.status(401).send({
              status: false,
              code: 500,
              message: "OTP expired.try again",
            });
            return;
          }
        } else {
          res.status(401).send({
            status: false,
            code: 500,
            message: "wrong OTP.Please Try again",
          });
          return;
        }
      }
    });
});
router.post("/OTP", function (req, res) {
  var dt = new Date();

  User.findOne({ phoneNumber: req.body.phone })
    .select(
      "_id firstName lastName username email gender phoneNumber otp otp_created_at"
    )
    .exec(function (err, user) {
      if (err) {
        res.status(500).send({ status: false, code: 500, message: err });
        return;
      } else {
        var seq = Math.floor(Math.random() * 900000);
        var dt = new Date();
        /*user['otp'] = seq;
                user['otp_created_at'] = dt.setHours(dt.getHours() + 1);
                user.save();*/
        User.updateOne(
          { _id: user["_id"] },
          { otp: seq, otp_created_at: dt.setHours(dt.getHours() + 1) },
          {
            runValidators: true,
            new: true,
          },
          function (e, u) {
            if (e) {
              res.status(500).json({ status: false, message: e });
            } else {
              //console.log(u);
              //res.status(200).json({ status: true, message: "Profile updated successfully" });

              var OTPtext =
                "Welcome to fitpair. Your Fitpair verification OTP is: " +
                seq +
                "\n" +
                "Do not share this with anyone. ";
              var url =
                "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
                req.body.phone +
                "&message=" +
                OTPtext;

              request(url, (error, response, body) => {
                if (error) {
                  console.log(error);
                } else {
                  console.log(response.statusCode);
                  console.log(body);
                }
              });
              /* var token = jwt.sign({ user: user._id }, config.secret, {
                           expiresIn: "24h" // 24 hours
                         });*/
              res.status(200).json({
                status: true,
                message: "We have sent OTP to your mobile Number.",
              });
            }
          }
        );
      }
    });
});
/*router.get('/OTP',[verifyToken],function(req,res){
  var dt=new Date();
  User.findOne({_id:req.userId})
  .select('firstName lastName username email gender phoneNumber otp otp_created_at') 
    .exec(function(err,user){
      if (err) {
        res.status(500).send({ status:false,code:500,message: err });
        return;
      }else{
        var seq = Math.floor(Math.random() * 900000);
          var dt=new Date();
          user['otp']=seq;
          user['otp_created_at']=dt.setHours(dt.getHours()+1);
          user.save();
            var OTPtext="Welcome to fitpair. Your OTP is: "+seq+"\n"+
                          "Do not share this with anyone. ";
            var url = 'https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to='+req.body.phoneNumber+'&message='+OTPtext;
      
              request(url, (error, response, body)=>{
                  if(error) console.log(error)
                  console.log(response.statusCode);
                  console.log(body);
              }); 
          var token = jwt.sign({ user: user._id }, config.secret, {
            expiresIn: "24h" // 24 hours
          });
          res.status(403).json(
            {
              status:true,
              message:"We have sent OTP to your mobile Number.",
              token:token
            })
      }
    });
});*/
router.get("/forgot-password", function (req, res) {
  var phone = req.query.phone ? req.query.phone : "";

  if (!phone) {
    res
      .status(500)
      .send({ status: false, code: 500, message: "Please Provide Phone No." });
  } else {
    User.findOne({ phoneNumber: phone })
      .select(
        "firstName lastName username email gender phoneNumber otp password_otp password_otp_created_at"
      )
      .exec(function (err, user) {
        if (err) {
          res.status(500).send({ status: false, code: 500, message: err });
          return;
        } else {
          if (!user) {
            res.status(500).send({
              status: false,
              code: 500,
              message: "Phone No. isnt registered with us.",
            });
          } else {
            var minm = 100000;
            var maxm = 999999;
            var seq = Math.floor(Math.random() * (maxm - minm + 1)) + minm;
            var dt = new Date();
            user["password_otp"] = seq;
            user["password_otp_created_at"] = dt.setHours(dt.getHours() + 1);
            user.save();
            var OTPtext =
              "Your password reset OTP is: " +
              seq +
              "\n" +
              "Do not share this with anyone. ";
            var url =
              "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
              user.phoneNumber +
              "&message=" +
              OTPtext;

            request(url, (error, response, body) => {
              if (error) console.log(error);
              console.log(response.statusCode);
              console.log(body);
            });
            /*var token = jwt.sign({ user: user._id }, config.secret, {
                          expiresIn: "24h" // 24 hours
                        });*/
            res.status(200).json({
              status: true,
              message:
                "We have sent OTP for password to your registered mobile Number.",
              //token:token
            });
          }
        }
      });
  }
});

router.post("/reset-password", function (req, res) {
  //console.log(req.body);
  if (!req.body.newPassword) {
    res.status(500).send({
      status: false,
      code: 500,
      message: "Please provide new password;",
    });
  } else {
    User.findOne({ password_otp: req.body.otp })
      .select(
        "firstName lastName username email gender phoneNumber password_otp password_otp_created_at"
      )
      .exec(function (err, user) {
        if (err) {
          res.status(500).send({ status: false, code: 500, message: err });
          return;
        } else {
          if (user) {
            var dt = new Date();
            if (user.password_otp !== 0) {
              user.password_otp = 0;
              user.password = bcrypt.hashSync(req.body.newPassword, 8);
              user.save();
              var token = jwt.sign({ user: user._id }, config.secret, {
                expiresIn: "365d", // 24 hours
              });

              var finUser = user.toObject();
              delete finUser.password;
              delete finUser.password_otp;
              delete finUser.password_otp_created_at;
              res.status(200).json({
                status: true,
                message: "password reset successfully.",
                token: token,
                data: finUser,
              });
            } else {
              res.status(400).send({
                status: false,
                code: 400,
                message: "OTP is wrong or expired.Please try again",
              });
            }
          } else {
            res.status(400).send({
              status: false,
              code: 400,
              message: "OTP is wrong.Please try again",
            });
          }
        }
      });
  }
});

router.get("/forgot-password", function (req, res) {
  var email = req.query.email ? req.query.email : "";
  if (!email) {
    res
      .status(500)
      .send({ status: false, code: 500, message: "Please Provide Email." });
  } else {
    User.findOne({ email: email })
      .select(
        "firstName lastName username email gender phoneNumber password_otp password_otp_created_at"
      )
      .exec(function (err, user) {
        if (err) {
          res.status(500).send({ status: false, code: 500, message: err });
          return;
        } else {
          if (!user) {
            res.status(500).send({
              status: false,
              code: 500,
              message: "Email isnt registered with us.",
            });
          } else {
            var seq = Math.floor(Math.random() * 900000);
            var dt = new Date();
            user["password_otp"] = seq;
            user["password_otp_created_at"] = dt.setHours(dt.getHours() + 1);
            user.save();
            var OTPtext =
              "Welcome to fitpair. Your password reset OTP is: " +
              seq +
              "\n" +
              "Do not share this with anyone. ";
            var url =
              "https://mx.fortdigital.net/http/send-message?username=89180134&password=wkzb8uqn&to=" +
              user.phoneNumber +
              "&message=" +
              OTPtext;

            request(url, (error, response, body) => {
              if (error) console.log(error);
              console.log(response.statusCode);
              console.log(body);
            });
            /*var token = jwt.sign({ user: user._id }, config.secret, {
                          expiresIn: "24h" // 24 hours
                        });*/
            res.status(200).json({
              status: true,
              message:
                "We have sent OTP for password to your registered mobile Number.",
              //token:token
            });
          }
        }
      });
  }
});

router.post("/reset-password", function (req, res) {
  //var token=req.query.token?req.query.token:'';

  // if (!req.body.otp) {
  //   res.status(500).send({ status: false, code: 500, message: "Please provide OTP sent to your mobile number;" });
  //   return;
  // } else
  if (!req.body.newPassword) {
    res.status(500).send({
      status: false,
      code: 500,
      message: "Please provide new password;",
    });
  } else {
    User.findOne({ email: req.body.email })
      .select(
        "firstName lastName username email gender phoneNumber password_otp"
      )
      .exec(function (err, user) {
        if (err) {
          res.status(500).send({ status: false, code: 500, message: err });
          return;
        } else {
          if (user) {
            var dt = new Date();
            if (user.password_otp == 0) {
              user.password_otp = 0;
              user.password = bcrypt.hashSync(req.body.newPassword, 8);
              user.save();
              var token = jwt.sign({ user: user._id }, config.secret, {
                expiresIn: "365d", // 24 hours
              });
              res.status(200).json({
                status: true,
                message: "password reset successfully.",
                token: token,
                data: user,
              });
            }
          } else {
            res.status(400).send({
              status: false,
              code: 400,
              message: "Email not exits or invalid",
            });
          }
        }
      });
  }
});
router.post("/change_email", [verifyToken], function (req, res) {
  if (!req.body.newEmail) {
    res.status(500).send({
      status: false,
      code: 500,
      message: "Please provide new email you want to register.",
    });
  } else {
    User.updateOne(
      { _id: req.userId },
      { email: req.body.newEmail },
      {
        runValidators: true,
        new: true,
      },
      function (e, u) {
        if (e) {
          res.status(500).json({ status: false, message: e });
        } else {
          res
            .status(200)
            .json({ status: true, message: "Profile updated successfully" });
        }
      }
    );
    /* User.findOne({ _id: userId })
             .select('email email_otp email_otp_created_at')
             .exec(function(err, user) {
                 if (err) {
                     res.status(500).send({ status: false, code: 500, message: err });
                     return;
                 } else {
                     var dt = new Date();
                     if (user.email_otp == req.body.otp && user.email_otp_created_at > dt.getHours()) {
                         user.email_otp = 0;
                         user.email = req.body.newEmail;
                         user.save();

                         res.status(200).json({
                             status: true,
                             message: "Email Changed successfully."
                         });
                     }
                 }
             });*/
  }
});

router.post("/check_credentials", function (req, res) {
  console.log(req.body);
  /*User.findOne({username:req.params.username})
      .exec(function(err,exists){
        if(err){
          res.status(500).json({status:false,message:err});
        }else{
          if(exists&&exists['_id']){
            res.status(200).json({status:false,message:"username already exists"});
          }else{
            res.status(200).json({status:true,message:"no username"});
          }
        }
      });*/

  // an example using an object instead of an array
  async.parallel(
    {
      email: function (callback) {
        setTimeout(function () {
          if (req.body.email) {
            User.findOne({ email: req.body.email }).exec(function (
              err,
              exists
            ) {
              if (err) {
                callback(err, null);
              } else {
                if (exists && exists["_id"]) {
                  callback(null, true);
                } else {
                  callback(null, false);
                }
              }
            });
          } else {
            callback(null, false);
          }
        }, 200);
      },
      username: function (callback) {
        setTimeout(function () {
          if (req.body.username) {
            User.findOne({ username: req.body.username }).exec(function (
              err,
              exists
            ) {
              if (err) {
                callback(err, null);
              } else {
                if (exists && exists["_id"]) {
                  callback(null, true);
                } else {
                  callback(null, false);
                }
              }
            });
          } else {
            callback(null, false);
          }
        }, 100);
      },
      phoneNumber: function (callback) {
        setTimeout(function () {
          if (req.body.phoneNumber) {
            User.findOne({ phoneNumber: req.body.phonenumber }).exec(function (
              err,
              exists
            ) {
              if (err) {
                callback(err, null);
              } else {
                if (exists && exists["_id"]) {
                  callback(null, true);
                } else {
                  callback(null, false);
                }
              }
            });
          } else {
            callback(null, false);
          }
        }, 100);
      },
    },
    function (err, results) {
      //console.log(results);
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        res.status(200).json({ status: true, data: results });
      }
      // results now equals to: { task1: 1, task2: 2 }
    }
  );
});

router.post("/change_password", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }).exec(function (err, usr) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      bcrypt.compare(
        req.body.oldPassword,
        usr.password,
        function (error, isMatch) {
          if (error) {
            res.status(500).send({ status: false, code: 500, message: error });
            return;
          } else if (isMatch) {
            usr.password = bcrypt.hashSync(req.body.newPassword, 8);
            usr.save();
            res.status(200).send({
              status: true,
              message: "Password updated successfully.",
            });
          } else {
            res
              .status(500)
              .send({ status: false, message: "Password not matched." });
          }
        }
      );
    }
  });
});

module.exports = router;
var saveGym = function (data, user) {
  console.log(data);
  var dt = new Date();
  if (data.title || data.station_name) {
    var name = data.title ? data.title : data.station_name;
    Gym.findOne({ title: name }).exec(function (err, gym) {
      if (err) {
        console.log(err);
      } else {
        if (gym && gym._id) {
          var gymData = {
            gym: [gym["_id"]],
            gym_updated_at: dt.setHours(dt.getHours() + 1),
            isGymMember: data.title && !data.station_name ? true : false,
          };
          User.updateOne(
            { _id: user },
            gymData,
            {
              runValidators: true,
              new: true,
            },
            function (e, u) {
              if (e) {
                console.log(e);
              } else {
                return;
              }
            }
          );
        } else {
          if (data.title) {
            const gymm = new Gym({
              title: data.title,
              address: data.address ? data.address : "",
              longitude:
                data.longitude && data.longitude !== "null"
                  ? data.longitude
                  : null,
              latitude:
                data.latitude && data.latitude !== "null"
                  ? data.latitude
                  : null,
              type: 0,
            });
            gymm.save();
            var gymData = {
              gym: [gymm["_id"]],
              gym_updated_at: dt.setHours(dt.getHours() + 1),
              isGymMember: true,
            };
            User.updateOne(
              { _id: user },
              gymData,
              {
                runValidators: true,
                new: true,
              },
              function (e, u) {
                if (e) {
                  console.log(e);
                } else {
                  return;
                }
              }
            );
          } else if (data.station_name) {
            const gymm = new Gym({
              title: data.station_name,
              address: data.station_address ? data.station_address : "",
              longitude:
                data.station_longitude && data.station_longitude !== "null"
                  ? data.station_longitude
                  : null,
              latitude:
                data.station_latitude && data.station_latitude !== "null"
                  ? data.station_latitude
                  : null,
              type: 1,
            });
            gymm.save();
            var gymData = {
              gym: [gymm["_id"]],
              gym_updated_at: dt.setHours(dt.getHours() + 1),
              isGymMember: false,
            };
            User.updateOne(
              { _id: user },
              gymData,
              {
                runValidators: true,
                new: true,
              },
              function (e, u) {
                if (e) {
                  console.log(e);
                } else {
                  return;
                }
              }
            );
          }
        }
      }
    });
  }
  return;
};
var addWallet = function (user) {
  var wal = new Wallet({
    points: 10,
    user: user,
  });
  wal.save();
  return;
};
var handleReferal = function (code) {
  User.findOne({ referal_code: code }).exec(function (err, user) {
    if (err) {
      console.log(err);
    } else {
      if (user && user["_id"]) {
        user["referals"] = user["referals"] + 1;
        user.save();

        Wallet.findOne({ user: user["_id"] }).exec(async function (
          err,
          wallet
        ) {
          if (err) {
            console.log(err);
          } else {
            wallet["points"] = wallet.points + 2;
            wallet.save();

            addTransaction(user["_id"], "ReferralReward", 2, 2, "completed");
            sendPushNotification(
              user["_id"],
              "Referral Reward",
              "Your referral was a success. We have added 2 points to your wallet. It will be visible in next version"
            );
            saveReferralNotification(8, user["_id"]);
          }
        });
      } else {
      }
    }
  });
};
var sendEmail = function (recvr) {
  var base64str = base64_encode("../uploads/icon.png");

  function base64_encode(file) {
    var bitmap = fs.readFileSync(path.resolve(__dirname, file));
    return new Buffer(bitmap).toString("base64");
  }
  //console.log(recvr)
  const mailOptions = {
    from: "GymPair<welcome@gympair.com>", // sender address
    to: recvr["email"], // list of receivers
    subject: "Welcome to fitpair - Your Fitness Community Awaits!",
    attachments: [
      {
        filename: "icon.png",
        content: base64str,
        type: "image/png",
        content_id: "myimagecid",
        disposition: "inline",
      },
    ],
    html:
      "<strong>Dear " +
      recvr["name"] +
      ",</strong><br>" +
      "\n" +
      "<br>" +
      "We extend a warm welcome to Fitpair! As a valued member of our community, we're thrilled to have you on board and are eager to witness the incredible progress and accomplishments you'll achieve on your fitness journey.<br>" +
      "<br>" +
      " At Fitpair, we are a passionate startup dedicated to revolutionizing the way you connect with like-minded individuals who share your enthusiasm for fitness. We understand that every step towards a healthier lifestyle matters, and we're committed to enhancing your user experience, providing you with a seamless interface, and delivering valuable benefits along the way.<br>" +
      "<br>" +
      "Our app has been thoughtfully designed to offer you easy and convenient access to a diverse community of gym-goers in your area. With Fitpair, finding a gym buddy who shares your workout preferences or frequents the same gym has never been easier. Embrace the opportunity to connect, motivate, and inspire one another as you embark on your fitness endeavors together.<br>" +
      "<br>" +
      " But that's not all! Fitpair goes beyond connecting you with fellow fitness enthusiasts. Our app also empowers you to track your progress effectively, enabling you to achieve your targets and goals. Utilize our range of calculators, and upcoming features like exercise demonstrations, nutrition tips  personalized workout plans to maximize your fitness journey.<br>" +
      "<br>" +
      " As a startup, we greatly value your patience and understanding as we continually strive to improve and enhance your Fitpair experience. Your feedback and suggestions are essential to us, so please don't hesitate to reach out to our dedicated customer support team at helpme@gympair.com should you have any questions or need assistance getting started.<br>" +
      "<br>" +
      " Once again, welcome to Fitpair! We are excited to accompany and support you on your fitness journey. Together, let's build a vibrant community that fosters motivation, inspiration, and success.<br>" +
      "<br>" +
      "Sincerely,<br>" +
      "Fitpair Team<br>" +
      "Find Your Pair<br>" +
      "www.Gympair.com<br>" +
      "<br>" +
      "<img style='width:200px;height:200px;' src='cid:myimagecid' />",
  };
  SG.send(mailOptions)
    .then((response) => {
      console.log({ status: "OK" });
    })
    .catch((error) => {
      console.log(error);
    });
};
var addTransaction = function (
  user,
  name,
  points,
  type,
  description,
  workout = null
) {
  var trans = new TransactionDB({
    description: description,
    points: points,
    workout: workout,
    type: type,
    user: user,
  });
  trans.save();
  //implement notifictaion here
  return;
};

function sendPushNotification(id, title, message) {
  User.findOne({ _id: id })
    .select("notificationToken")
    .exec(function (err, dev) {
      if (err) {
        res.status(500).json({ message: err });
      } else {
        if (dev && dev.notificationToken) {
          const options = {
            method: "POST",
            url: config.OSUrl + "/notifications",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
            },
            data: {
              app_id: config.appID,
              include_player_ids: dev.notificationToken,
              contents: { en: message },
              headings: { en: title },
            },
          };
          // console.log(options);

          axios
            .request(options)
            .then(function (response) {
              console.log("response", response.data);
            })
            .catch(function (error) {
              console.log("error", error);
            });
        }
      }
    });
}

var saveReferralNotification = function (type, receiver) {
  User.findOne({ _id: receiver }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: type,
        receiver: receiver,
        content: "Referral Reward",
      });

      not.save();
    }
  });
};
