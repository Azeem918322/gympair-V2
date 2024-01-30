var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var fs = require('fs');
const { verifyToken, isAdmin } = require('../middlewares/verifyToken');
const { Challenge } = require('../middlewares/validations');
var User = db.user;
var Feed = db.feed;
var Muscle=db.muscle;
var Workout_challenge = db.challenge;
const multer = require("multer");

router.post('/login', function(req, res) {
    User.findOne({ $or: [{ username: req.body.username }, { email: req.body.username }] }, '_id firstName lastName username email password')
        .exec(function(err, user) {
            if (err) {
                res.status(500).send({ status: false, code: 500, message: err });
                return;
            } else {
                if (user) {
                    bcrypt.compare(req.body.password, user.password, function(error, isMatch) {
                        if (error) {
                            console.log(error);
                            res.status(500).send({ status: false, code: 500, message: error });
                            return;
                        } else if (isMatch) {
                            var token = jwt.sign({ user: user._id }, config.secret, {
                                expiresIn: "24h" // 24 hours
                            });
                            var usr = user.toObject();
                            delete usr['password'];
                            res.status(200).json({
                                status: true,
                                message: "Admin Logged In Successfully.",
                                token: token,
                                data: usr
                            })
                        } else {
                            res.status(500).send({ status: false, code: 500, message: "Password Doesn't Match." });
                            return;
                        }
                    });


                } else {
                    return res.status(401).send({ message: "Unauthorized.User Doesn't exist." });
                }
            }
        })
});
/*router.post('/register',function(req,res){
  const user = new User({
            "firstName": (req.body.firstName && req.body.firstName != "string") ? req.body.firstName : "",
            "lastName": (req.body.lastName && req.body.lastName != "string") ? req.body.lastName : "",
            "username": req.body.username,
            "email": req.body.email.toLowerCase(),
            "password": bcrypt.hashSync(req.body.password, 8)
          });
  user.save();
  res.json({message:"Admin account created"});
});*/

router.get('/posts', [verifyToken, isAdmin], function(req, res) {
    if (req.query && req.query.t == 'n') { //get new posts which are still under review.
        Feed.find({ under_review: true }).sort({ createdAt: -1 })
        .populate('user')
        .exec((err, records) => {
            if (err) {
                console.error(err);
                // Handle error
            } else {
                res.json(records);
                // Your sorted records are in the 'records' array
            }
        });
    }else if(req.query.t=='a'){
      Feed.find({ under_review: false }).sort({ createdAt: -1 })
      .populate('user')
      .exec((err, records) => {
            if (err) {
                console.error(err);
                // Handle error
            } else {
                res.json(records);
                // Your sorted records are in the 'records' array
            }
        });
    }
})
router.post('/addmusclediagram',function(req,res){
    Muscle.create(req.body,function(err,diagram){
        if(err){
            res.json({status:false,error:err})
        }else{
            res.json({status:true,muscleDiagram:diagram})
        }
    })
})
router.post('/moderate/:id',[verifyToken,isAdmin],function(req,res){
  //review (accept/decline) a post with comments
  
  
})
var storageVid = multer.diskStorage({
    destination: function(req, file, callback) {
        var dirUploads = './uploads/';
        if (!fs.existsSync(dirUploads)) {
            fs.mkdirSync(dirUploads);
        }
        var dirUploadsWorkout = './uploads/workout/';
        if (!fs.existsSync(dirUploadsWorkout)) {
            fs.mkdirSync(dirUploadsWorkout);
        }
        var dirUploadsCh = './uploads/workout/challenges/';
        if (!fs.existsSync(dirUploadsCh)) {
            fs.mkdirSync(dirUploadsCh);
        }
        callback(null, dirUploadsCh);
    },
    filename: function(req, file, callback) {
        const datetimestamp = Date.now();
        const videoName = "workout_" + file.originalname.split('.')[0] + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];

        callback(null, videoName);
    }
});
var uploadVideo = multer({ storage: storageVid }).any('video');


router.post('/workout_challenge', [verifyToken, isAdmin], function(req, res) {
    uploadVideo(req, res, function(err, f) {
        const path = req.files ? config.apiUrl + "/uploads/workout/challenges/" + req.files[0].filename : ''
        var ch = new Workout_challenge({
            challenge_description: req.body.challenge_description,
            fitness_level: req.body.fitness_level,
            challenge_video: path
        });

        ch.save((err, challenge) => {
            if (err) {
                res.status(500).send({ status: false, code: 500, message: err });
                return;
            } else {
                return res.status(200).json({
                    status: true,
                    message: "Workout Challenge created successfully."
                })
            }
        });

    })
})
router.get('/workout_challenge', [verifyToken, isAdmin], function(req, res) {
    Workout_challenge.find(function(err, workout) {
        if (err) {
            res.status(500).json({ err: err })
        } else {
            res.status(200).json({ status: true, data: workout })
        }
    });
})
module.exports = router;