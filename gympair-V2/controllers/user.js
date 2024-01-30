var express = require('express')
var router = express.Router()
var fs = require('fs');
var path = require('path');
const config = require("../config");
const db = require("../models");
const { verifyToken } = require('../middlewares/verifyToken');
const mime = require('mime');

const User = db.user;
const Feed = db.feed;
const Gym = db.gym;
const Friend=db.friends;
const ImgSocket = db.imgSocket;
const multer = require("multer");
const handleError = (err, res) => {
    res.status(500).json({ message: "Oops! Something went wrong!" });
};

var Storage = multer.diskStorage({ //multers disk storage settings
    destination: function(req, file, cb) {
        var dir = './uploads/' + req.userId;
        fs.exists(dir, (exist) => {
            if (exist) {
                cb(null, dir);
            } else {
                fs.mkdir(dir, error => {
                    if (!error) {
                        cb(null, dir);
                    }
                })
            }
        })
    },
    filename: function(req, file, cb) {
        // var datetimestamp = Date.now();
        var imgName = "dp_" + file.originalname.split('.')[0] + '-' + req.userId + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];
        User.updateOne({ _id: req.userId }, { profile_picture: config.apiUrl + "/uploads/" + req.userId + "/" + imgName }, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("updated");
            }
        })
        //console.log(imgName);
        cb(null, imgName);
    }
});
var upload = multer({ //multer settings
    storage: Storage
}).single('profile_picture');

var storageImg = multer.diskStorage({

    destination: function(req, file, callback) {
        //console.log("file upload");
        if (file.fieldname === "image") {
            var dirUploads = './uploads/socket';
            if (!fs.existsSync(dirUploads)) {
                fs.mkdirSync(dirUploads);
            }
            var dirImages = './uploads/socket/images';
            if (!fs.existsSync(dirImages)) {
                fs.mkdirSync(dirImages);
            }
            var dir = './uploads/socket/images/' + req.userId;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            callback(null, dir);
        } else if (file.fieldname === "video") {
            //console.log("video upload");
            var dirUploads = './uploads/socket';
            if (!fs.existsSync(dirUploads)) {
                fs.mkdirSync(dirUploads);
            }
            var dirVids = './uploads/socket/videos';
            if (!fs.existsSync(dirVids)) {
                fs.mkdirSync(dirVids);
            }
            var dir = './uploads/socket/videos/' + req.userId;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            callback(null, dir);
        }
    },
    filename: function(req, file, callback) {
        const datetimestamp = Date.now();
        const imgName = "socket_" + file.originalname.split('.')[0] + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];

        callback(null, imgName);
    }
});
var uploadImg = multer({
    storage: storageImg
}).fields(
    [{
            name: 'image'
        },
        {
            name: 'video'
        }
    ]
);

router.post('/upload_image', [verifyToken], function(req, res) {
    uploadImg(req, res, function(err, f) {
        if (req.files) {
            if (req.files['image']) {
                var img = [];
                req.files['image'].forEach((f, i) => {
                    const path = config.apiUrl + "/uploads/socket/images/" + req.userId + "/" + f.filename
                    const imgSocket = new ImgSocket({
                        "video": '',
                        "image": path,
                        user: req.userId
                    });
                    imgSocket.save((err, usr) => {
                        if (err) {
                            res.status(500).send({ status: false, code: 500, message: err });
                            return;
                        } else {
                            imgSocket.save();

                        }
                    });
                    if (i == req.files['image'].length - 1) {
                        res.status(200).json({
                            status: true,
                            message: "Image uploaded successfully.",
                            data: path
                        })
                    }
                })

            }
        }



    })
});
router.post('/upload_video', [verifyToken], function(req, res) {
    uploadImg(req, res, function(err, f) {
        if (err instanceof multer.MulterError) {
            console.log("multer error");
            console.log(err);
            res.status(500).json({ status: false, message: "Something went wrong with video upload." });
        } else if (err) {
            console.log("other error");
            console.log(err);
            res.status(500).json({ status: false, message: "Something went wrong with video upload.Please try again" });
        }
        if (req.files) {
            if (req.files['video']) {
                var img = [];
                req.files['video'].forEach((f, i) => {
                    const path = config.apiUrl + "/uploads/socket/videos/" + req.userId + "/" + f.filename
                    const imgSocket = new ImgSocket({
                        "video": path,
                        "image": "",
                        user: req.userId
                    });
                    imgSocket.save((err, usr) => {
                        if (err) {
                            res.status(500).send({ status: false, code: 500, message: err });
                            return;
                        } else {
                            imgSocket.save();

                        }
                    });
                    if (i == req.files['video'].length - 1) {
                        res.status(200).json({
                            status: true,
                            message: "Video uploaded successfully.",
                            data: path
                        })
                    }
                })

            }
        }



    })
});

router.post("/profile_picture", [verifyToken], function(req, res, error) {
    upload(req, res, function(err, f) {
        console.log(err);
        console.log(f);
        res.status(200).json({
            status: true,
            message: "Profile Picture uploaded successfully."
        });
    })
});
router.delete('/profile_picture', [verifyToken], function(req, res) {

    User.findOne({ _id: req.userId }).select('profile_picture').exec(function(err, pic) {
        if (err) {
            res.status(500).json({ message: err });
            return;
        } else {
            var deleteFile = path.join(__dirname, "../" + pic.profile_picture);
            if (fs.existsSync(deleteFile)) {
                fs.unlink(deleteFile, (error) => {
                    if (error) {
                        res.status(500).json({ message: error });
                        return;
                    } else {
                        pic.profile_picture = '';
                        pic.save();
                        res.status(200).json({ status: true, message: "Profile picture removed successfully." })
                    }
                })
            }
        }
    })
})
router.get('/followers', [verifyToken], function(req, res) {
    User.findOne({ _id: req.userId }, '_id followers')
        .populate('followers', '_id username email firstName lastName profile_picture vaccinated height weight introduction gender')
        .exec(function(err, user) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                res.status(200).json({ data: user });
            }
        });
})
router.get('/followings', [verifyToken], function(req, res) {
    User.findOne({ _id: req.userId }, '_id followings')
        .populate('followings', '_id username email firstName lastName profile_picture vaccinated height weight introduction gender')
        .exec(function(err, user) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                res.status(200).json({ data: user });
            }
        });
})
router.get('/matches', [verifyToken], function(req, res) {
    Friend.find({$or:[{ user1: req.userId },{user2:req.userId}]})
    .where({status:"accepted"})
        //.populate('liked_to', '_id username email firstName lastName profile_picture vaccinated height weight introduction gender')
        //.populate('liked_by', '_id username email firstName lastName profile_picture vaccinated height weight introduction gender')
        .populate('user1', '_id username email firstName lastName profile_picture vaccinated height weight introduction gender')
        .populate('user2', '_id username email firstName lastName profile_picture vaccinated height weight introduction gender')
        .exec(function(err, friends) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                console.log(friends.length);
                // liked from both sides
                //commonElements = user['liked_by'].filter(element => user['liked_to'].some((o) => element._id.equals(o._id)))
                res.json({ matches: friends })
            }
        });
})
router.post('/gym', [verifyToken], function(req, res) {
    console.log("gym adding");
    User.findOne({ _id: req.userId }).exec(function(err, usr) {
        if (err) {
            res.status(500).json({ status: false, error: err });
        } else {
            var d = usr.gym_updated_at ? new Date(usr.gym_updated_at) : null;
            var cd = new Date();
            if (d && cd <= d && (!usr['subscription'] || usr['subscription'] == 0)) {
                return res.status(400).json({ staus: false, message: "Sorry!you can add gym only once in a month." });
            } else {
                var dt = cd.setHours(cd.getHours() + 1);
                Gym.findOne()
                    .where({ address: req.body.address })
                    .exec(function(e, g) {
                        if (e) {
                            console.log(e);
                        } else {

                            if (!g || !g['_id']) { //already not saved gym
                                console.log("already ot saved gym");
                                gymData = {
                                    title: req.body.title,
                                    address: req.body.address,
                                    longitude: req.body.longitude,
                                    latitude: req.body.latitude,
                                    type: 0
                                }
                                Gym.create(gymData, function(er, gy) {
                                    if (er) {
                                        console.log(er);
                                    } else {
                                        //console.log(gy);
                                        if (usr.gym && usr.gym.length > 0 && (!usr.subscription || usr.subscription == 0)) { //free user's gym update
                                            usr.gym = [gy._id];
                                            usr.gym_updated_at = dt;
                                            usr.save();
                                            res.status(200).json({ status: true, message: "Gym Added successfully." });
                                        } else if (usr.gym && usr.gym.length > 0 && (usr.subscription && usr.subscription == 1)) { //update user's gym added
                                            usr.gym.push(gy._id);
                                            usr.gym_updated_at = dt;
                                            usr.save();
                                            res.status(200).json({ status: true, message: "Gym Added successfully." });
                                        } else {
                                            usr.gym = [gy._id];
                                            usr.gym_updated_at = dt;
                                            usr.save();
                                            res.status(200).json({ status: true, message: "Gym Added successfully." });
                                        }
                                    }
                                })

                            } else {
                                console.log("already gym");
                                if (usr.gym && usr.gym.length > 0 && (!usr.subscription || usr.subscription == 0)) { //free user's gym update
                                    usr.gym = [g._id];
                                    usr.gym_updated_at = dt;
                                    usr.save();
                                    res.status(200).json({ status: true, message: "Gym Added successfully." });
                                } else if (usr.gym && usr.gym.length > 0 && (usr.subscription && usr.subscription == 1)) { //update user's gym added
                                    usr.gym.push(g._id);
                                    usr.gym_updated_at = dt;
                                    usr.save();
                                    res.status(200).json({ status: true, message: "Gym Added successfully." });
                                } else {
                                    usr.gym = [g._id];
                                    usr.gym_updated_at = dt;
                                    usr.save();
                                    res.status(200).json({ status: true, message: "Gym Added successfully." });
                                }

                            }
                        }
                    })

            }
        }
    })
})
router.put('/gym/:id', [verifyToken], function(req, res) {
    User.findOne({ _id: req.userId }).exec(function(err, usr) {
        if (err) {
            res.status(500).json({ status: false, error: err });
        } else {
            var d = usr.gym_updated_at ? new Date(usr.gym_updated_at) : null;
            var cd = new Date();
            var dt = d.setHours(d.getHours() + 1);
            Gym.findOne()
                .where({ address: req.body.address })
                .exec(function(e, g) {
                    if (e) {
                        console.log(e);
                    } else {
                        if (!g || !g['_id']) { //already not saved gym
                            gymData = {
                                title: req.body.title,
                                address: req.body.address,
                                longitude: req.body.longitude,
                                latitude: req.body.latitude,
                                type: 0
                            }
                            Gym.create(gymData, function(er, gy) {
                                if (er) {
                                    console.log(er);
                                } else {
                                    /*usr.gym = usr.gym.filter(function(element) {
                                        return element !== req.params.id;
                                    });*/
                                    usr.gym.pull(req.params.id);
                                    usr.gym.push(gy._id);
                                    usr.gym_updated_at = dt;
                                    usr.save();
                                    res.status(200).json({ status: true, message: "Gym updated successfully." });
                                }
                            })

                        } else {
                            /*usr.gym = usr.gym.filter(function(element) {
                                return element !== req.params.id;
                            });*/
                            usr.gym.pull(req.params.id);
                            usr.gym.push(g._id);
                            usr.gym_updated_at = dt;
                            usr.save();
                            res.status(200).json({ status: true, message: "Gym updated successfully." });

                        }
                    }
                })

        }
    })
})
router.delete('/gym/:id', [verifyToken], function(req, res) {
    User.updateOne({ _id: req.userId }, {
            $pull: {
                gym: req.params.id,
            },
        })
        .exec(function(err, usr) {
            if (err) {
                res.status(500).json({ status: false, error: err });
            } else {
                res.status(200).json({ status: true, message: "Gym removed successfully." });
            }
        });
})

router.get('/:id', [verifyToken], function(req, res) {
    //console.log('getone');
    if (req.params.id == req.userId) {
        User.findOne({ _id: req.params.id }, ' -password -otp -otp_created_at -email-otp -email_otp_created_at -password_otp -password_otp_created_at')
            .populate('gym')
            .populate('followers', 'username email firstName lastName profile_picture')
            .populate('followings', 'username email firstName lastName profile_picture')
            .populate('liked_by', 'username email firstName lastName profile_picture')
            .populate('liked_to', 'username email firstName lastName profile_picture')
            .populate('disliked_by', 'username email firstName lastName profile_picture')
            .populate('disliked_to', 'username email firstName lastName profile_picture')
            .populate('posts', '_id user image video type caption privacy likes comments allowComments allowLikes', null, { sort: { 'updatedAt': -1 } })
            .exec(function(err, user) {
                if (err) {
                    res.status(500).json({ status: false, message: err });
                } else {
                    res.status(200).json({ data: user });
                }
            });
    } else {
        User.findOne({ _id: req.params.id }, '-longitude -latitude -gym_updated_at -referal_code -password -otp -otp_created_at -email-otp -email_otp_created_at -password_otp -password_otp_created_at')
            .populate('gym')
            .populate('followers', 'username email firstName lastName profile_picture')
            .populate('followings', 'username email firstName lastName profile_picture')
            .populate('liked_by', 'username email firstName lastName profile_picture')
            .populate('liked_to', 'username email firstName lastName profile_picture')
            .populate('disliked_by', 'username email firstName lastName profile_picture')
            .populate('disliked_to', 'username email firstName lastName profile_picture')
            .populate('gym')
            .populate('posts', '_id user image video type caption privacy likes comments allowComments allowLikes', null, { sort: { 'updatedAt': -1 } })
            .exec(function(err, user) {
                if (err) {
                    res.status(500).json({ status: false, message: err });
                } else {
                    res.status(200).json({ data: user });
                }
            });
    }
})
router.put('/', [verifyToken], function(req, res) {
    const updateData = {};
    for (const field in req.body) {
        if (req.body[field] !== '' && field !== 'workout' && req.body[field] !== 0) {
            updateData[field] = req.body[field];
        } else if (field == 'workout') {
            updateData[field] = {};
            //if(req.body.workout&&req.body.workout.workout_type!==''){
            updateData['workout']['workout_type'] = req.body.workout.workout_type ? req.body.workout.workout_type : '';
            updateData['workout']['days'] = req.body.workout.days ? req.body.workout.days : [];
            updateData['workout']['time'] = req.body.workout.time ? req.body.workout.time : [];
            // }
        }
    }

    User.findOne({ _id: req.userId })
        .exec(function(err, usr) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                //console.log(updateData);
                User.updateOne({ _id: req.userId }, { $set: updateData }, {
                    runValidators: true,
                    new: true,
                }, function(e, u) {
                    console.log(e);
                    //console.log(u);
                    if (e) {
                        res.status(500).json({ status: false, message: e });
                    } else {
                        res.status(200).json({ status: true, message: "Profile updated successfully" });
                    }
                })
            }
        });
    /*if (req.body && !req.body.gym_name && !req.body.gym_address) {
        
    } else {
        res.status(200).json({ status: true, message: "Profile updated successfully" });
    }*/
});
router.get('/', [verifyToken], function(req, res) {
    User.findOne({ _id: req.userId },
            '-password -otp -otp_created_at -password_otp -password_otp_created_at -email_otp -email_otp_created_at'
        )
        .populate('gym')
        .populate('posts', '_id user image video type caption privacy likes comments allowComments allowLikes', null, { sort: { 'updatedAt': -1 } })
        .populate('followers', 'username email firstName lastName profile_picture')
        .populate('followings', 'username email firstName lastName profile_picture')
        .exec(function(err, user) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                res.status(200).json({ data: user });
            }
        });
});

/*router.put('/gym/:id',[verifyToken],function(req,res){
  User.findOne({_id:req.userId})
  .exec(function(err,usr){
    if(err){
      res.status(500).json({status:false,message:err});
    }else{
      if(usr.gym_name&&usr.gym_updated_at){//if gym already saved
      var d=new Date(usr.gym_updated_at);
      var cd=new Date();
      if(cd<=d){
        res.status(400).json({staus:false,message:"Sorry!you can update gym only once in a month."});
      }else{
        var d=new Date();
        var dt=d.getMonth()<11?d.getFullYear()+"/"+JSON.parse(d.getMonth())+JSON.parse(2)+"/"+d.getDate():JSON.parse(d.getFullYear())+JSON.parse(1)+"/01/"+d.getDate();
        usr.gym=req.params.id;
        usr.gym_updated_at=dt
        usr.save();
        res.status(200).json({status:true,message:"Your GYM is Updated."});
      }
    }else{//no gym already saved
      var d=new Date();
      var dt=d.getMonth()<11?d.getFullYear()+"/"+JSON.parse(d.getMonth())+JSON.parse(2)+"/"+d.getDate():JSON.parse(d.getFullYear())+JSON.parse(1)+"/01/"+d.getDate();
      usr.gym=req.params.id;
      usr.gym_updated_at=dt
      usr.save();
      res.status(200).json({status:true,message:"Your GYM is Updated."});
    }
    }
  });
});*/

router.put('/location', [verifyToken], function(req, res) {
    User.updateOne({ _id: req.userId }, { $set: { longitude: req.body.longitude, latitude: req.body.latitude } })
        .exec(function(err, usr) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                console.log(usr);
                res.status(200).json({ status: true, message: "Location is set successfully." })
            }
        });
});
router.post('/age_range', [verifyToken], function(req, res) {
    User.updateOne({ _id: req.userId }, { age_start: req.body.age_start, age_end: req.body.age_end }, function(err, prefs) {
        if (err) {
            res.status(500).json({ status: false, message: err })
        } else {
            console.log(prefs);
            res.status(200).json({ status: true, message: "Age preference is set." })
        }
    })
})

router.delete('/', [verifyToken], function(req, res) {
    //console.log(req.userId);
    User.deleteOne({ _id: req.userId }, function(err, acc) {
        if (err) {
            res.status(500).json({ status: false, message: err });
        } else {
            //console.log(acc);
            Feed.deleteMany({ user: req.userId }, function(e, u) {
                if (e) {
                    return res.json(e);
                } else {
                    res.status(200).json({ status: true, message: "Your account is deleted permanently.but don't be sad.You can register again with us. " });

                }
            });

        }
    })
});

router.get('/bulk/test', function(req, res) {
    User.find({ "workout.days": "Monday,Tuesday" })
        .exec(function(err, user) {
            if (user) {
                for (var u in user) {
                    user[u]['workout']['days'] = user[u]['workout']['days'].toString().replace('Monday,Tuesday', 'Monday');

                    console.log(user[u]['workout']['days']);
                    console.log('-----');
                    user[u].save();

                }
            }
        });
});

router.get("/username/search", [verifyToken], function (req, res) {
  const searchName = req.query.searchName;

  User.find({
    _id: { $ne: req.userId },
    $and: [
      {
        $or: [
          { username: { $regex: searchName } },
          { firstName: { $regex: searchName } },
          { lastName: { $regex: searchName } },
        ],
      },
      {
        $or: [
          { followers: { $in: [req.userId] } },
          { followings: { $in: [req.userId] } },
        ],
      },
    ],
  })
    .select("_id firstName lastName username profile_picture")
    .exec(function (err, users) {
      if (err) {
        res.status(200).json({ status: false, message: err });
      } else {
        res.status(200).send({
          status: true,
          message: "Search done successfully",
          data: users,
        });
        
      }
    });
});

module.exports = router;