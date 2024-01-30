var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const { gymDateRequestValidator } = require("../middlewares/validations");
const axios = require("axios");
const cheerio = require("cheerio");

const Gym = db.gym;
const User = db.user;
const Friend = db.friends;
const GymPair = db.gymPair;
const Chat = db.Chat;
const Message = db.Message;
const Notification = db.notification;
const Muscle=db.muscle;
router.post("/", function (req, res) {
  req.body["created_by"] = req.body.created_by ? req.body.created_by : "admin";
  Gym.create(req.body, function (err, gym) {
    if (err) {
      res.status(500).json({ status: false, message: err, code: 500 });
    } else {
      res.status(200).json({
        status: true,
        message: "Gym created successfully",
        data: gym,
	        });
    }
  });
});
router.get('/',function(req,res){
	Gym.find()
	.exec(function(err,gyms){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
        {
          gyms:gyms
        });
		};
});
});
router.post('/search',function(req,res){
	Gym.find()
	.where({$and:[{latitude:req.body.latitude},{longitude:req.body.longitude}]})
	.exec(function(err,gyms){
			if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			if(gyms&&gyms.length==0){
				res.status(200).json({status:false,message:"No gym at this location"});
			}else{
			res.status(200).json(
        {
          gyms:gyms
        });
		}
		};
	});
});
//delete one user's gym
router.delete('/user/:id',[verifyToken],function(req,res){
	
})
router.get('/prompt',[verifyToken],function(req,res){//check if user doesnt have gym saved
	User.findOne({_id:req.userId},'gym')
	.populate('gym')
	.exec(function(err,usr){
		if(err){
			res.status(500).json({error:err});
		}else{
			if(!usr.gym||usr.gym.length==0){
				res.status(200).json({status:true,data:true})
			}else if(usr.gym&&usr.gym.length==1&&usr.gym[0].type==1){//station saved,no gym
				res.status(200).json({status:true,data:true})
			}else{
				res.status(200).json({status:true,data:false})
			}
		}
	});
})
router.get('/:id',function(req,res){
	Gym.findOne({_id:req.params.id})
	.exec(function(err,gym){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
        {
        		status:true,        		
          		data:gym
        });
		};
	})
});
router.post('/search',function(req,res){
	Gym.find()
	where({$and:[{latitude:req.body.latitude},{longitude:req.body.longitude}]})
	.exec(function(err,gyms){
			if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			if(gyms&&gyms.length==0){
				res.status(204).json({staus:false,message:"No gym at this location"});
			}else{
			res.status(200).json(
        {
          gyms:gyms
        });
		}
		};
	});
});
router.put('/:id',function(req,res){
	Gym.findOneAndUpdate(
		{_id: req.body._id},
		 {$set:req.body},
		 {new:true},
		 function(err,gym){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
        {
        		status:true,        		
          		message:"Gym Data updated successfully"
        });
      }
    }
  );
});
router.delete("/:id", function (req, res) {
  Gym.deleteOne({ _id: req.params.id }, function (err, gym) {
    if (err) {
      res.status(500).json({ status: false, message: err, code: 500 });
    } else {
      res.status(200).json({
        status: true,
        message: "Gym Data Deleted successfully",
      });
    }
  });
});

router.get("/musclediagram/:type/:gender", async function (req, res) {
  console.log("req.params", req.params);
  let gender=req.params.gender?req.params.gender:'male';
  let type = req.params.type;

  /*if (req.params.type == "chest") {
    type = "chest";
  } else if (req.params.type == "shoulder") {
    type = "shoulders";
  } else if (req.params.type == "trap") {
    type = "trap";
  } else if (req.params.type == "bicep") {
    type = "biceps";
  } else if (req.params.type == "forearm") {
    type = "forearms";
  } else if (req.params.type == "oblique") {
    type = "obliques";
  } else if (req.params.type == "abdominal") {
    type = "abdominals";
  } else if (req.params.type == "quad") {
    type = "quads";
  } else if (req.params.type == "calve") {
    type = "calves";
  } else if (req.params.type == "glute") {
    type = "glutes";
  } else if (req.params.type == "lat") {
    type = "lats";
  } else if (req.params.type == "trapMid") {
    type = "traps_middle";
  } else if (req.params.type == "tricep") {
    type = "triceps";
  } else if (req.params.type == "hamstring") {
    type = "hamstrings";
  } else if (req.params.type == "lower") {
    type = "lower";
  } else if (req.params.type == "none") {
    type = "";
  }*/
  Muscle.find({bodyPart:type,gender:gender},function(e,record){
    if(e){
      res.json({status:false,error:e})
    }else{
      res.json({status: true,
    message: "Muscle diagram link fetched successfully",
    data: record});
    }
  });
  /*let myResult = await fetchData(
    "https://musclewiki.com/exercises/male/" + type
  ).then((res) => {
    const html = res.data;
    const $ = cheerio.load(html);
    const contents = $("#mw-content-text > div:nth-child(2)").children();
    let result = [];
    let i = 0;
    contents.each(function () {
      if (i == contents.length - 1) {
        return;
      }

      let tempObj = {
        title: "",
        contents: "",
        videos: "",
		};
      let title = $(".mw-headline:eq(" + i + ") > a").text();
      console.log("title", title);

      let url = $(".exercise-images-grid:eq(" + i + ") > a");
      const content = $("div > ol:eq(" + i + ")")
        .first()
        .children();
      let contentArr = [];
      let videoArr = [];

      content.each(function () {
        const contentData = $(this).text();
        contentArr.push(contentData.trim());
      });

      url.each(function () {
        let video = $(this).attr("href");
        if (!video.includes("musclewiki")) {
          videoArr.push(video);
        }
      });

      var uniqVideos = [...new Set(videoArr)];

      tempObj.title = title;
      tempObj.videos = uniqVideos;
      tempObj.contents = contentArr;
      result.push(tempObj);
      i++;
    });

    return result;
  });*/

  
});

async function fetchData(url) {
  console.log("Crawling data...");
  // make http call to url
  let response = await axios(url).catch((err) => console.log(err));

  if (response.status !== 200) {
    console.log("Error occurred while fetching data");
    return;
  }
  return response;
}

router.post(
  "/date_request",
  [verifyToken, gymDateRequestValidator],
  function (req, res) {
    //send gym pair request
    User.findOne({
      $or: [
        { followers: { $in: [req.userId] } },
        { followings: { $in: [req.userId] } },
        { followers: { $in: [req.body.partnerId] } },
        { followings: { $in: [req.body.partnerId] } },
      ],
    }).exec(async function (err, fr) {
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        if (fr && fr.status == "accepted") {
          res
            .status(200)
            .json({ status: false, message: "Request already accepted" });
        } else if (fr && fr.status == "pending") {
          res
            .status(200)
            .json({ status: false, message: "Request already pending" });
        } else {
          let gymData = req.body.gymInfo;
          let gymId = "";

          let gymExist = await Gym.findOne({
            title: gymData._title,
            address: gymData.address,
            latitude: gymData.latitude,
            longitude: gymData.longitude,
            type: gymData.type,
        });

          if (gymExist) {
            gymId = gymExist._id;
          } else {
            let newGym = await Gym.create({
              title: gymData._title,
              address: gymData.address,
              latitude: gymData.latitude,
              longitude: gymData.longitude,
              type: gymData.type,
            });

            gymId = newGym._id;
          }

          var request = {
            gym: gymId,
            user: req.userId,
            partner: req.body.partnerId,
            status: "pending",
            time: req.body.time,
            date: req.body.date,
            request_by: req.userId,
            description: req.body.description,
		};

          GymPair.create(request, function (er, re) {
            if (er) {
              res.status(500).json({ status: false, message: er });
            } else {
              Chat.findOne({
                $or: [
                  {
                    $and: [
                      { user1: req.userId },
                      { user2: req.body.partnerId },
                    ],
                  },
                  {
                    $and: [
                      { user1: req.body.partnerId },
                      { user2: req.userId },
                    ],
                  },
                ],
              }).exec(function (err, chat) {
                if (err) {
                  res.status(500).json({ status: false, message: err });
                } else {
                  if (chat) {
                    if (!chat.initiated) {
                      chat.initiated = true;
                      chat.save();
                    }

                    Message.create(
                      {
                        chat: chat._id,
                        sender: req.userId,
                        reciever: req.body.partnerId,
                        isLike: false,
                        messageType: 1,
                        requestMessage: re._id,
                        text: "[WORKOUT_REQUEST]",
                      },
                      (err, msg) => {
                        if (err) {
                          res.status(500).json({ status: false, message: err });
                        } else {
                          sendPushNotification(
                            req.body.partnerId,
                            "Gym Date Request",
                            " Send a Gympair Request"
                          );
                          saveNotification(2, req.userId, req.body.partnerId);
                          res.status(200).json({
                            status: true,
                            message:
                              "Request sent successfully. Please wait for response.",
                          });
                        }
                      }
                    );
                  } else {
                    Chat.create(
                      {
                        user1: req.userId,
                        user2: req.body.partnerId,
                        initiated: true,
                      },
                      (err, newChat) => {
                        if (err) {
                          res.status(500).json({ status: false, message: err });
                        } else {
                          Message.create(
                            {
                              chat: newChat._id,
                              sender: req.userId,
                              reciever: req.body.partnerId,
                              isLike: false,
                              messageType: 1,
                              requestMessage: re._id,
                              text: "[WORKOUT_REQUEST]",
                            },
                            (err, msg) => {
                              if (err) {
                                res
                                  .status(500)
                                  .json({ status: false, message: err });
                              } else {
                                sendPushNotification(
                                  req.body.partnerId,
                                  "Gym Date Request",
                                  " Send a Gympair Request"
                                );
                                saveNotification(
                                  2,
                                  req.userId,
                                  req.body.partnerId
                                );
                                res.status(200).json({
                                  status: true,
                                  message:
                                    "Request sent successfully. Please wait for response.",
                                });
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              });
            }
          });
        }
      }
    });
  }
);

router.get("/respond_date_request/:id", [verifyToken], function (req, res) {
  GymPair.findOne({ _id: req.params.id }).exec(function (err, fr) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      if (fr && fr.status !== "pending") {
        //if already responded
        res
          .status(200)
          .json({ status: false, message: "Request already responded" });
      } else if (fr && fr.status == "pending") {
        var st = req.query.status == 1 ? "accepted" : "declined";
        GymPair.updateOne({ _id: fr._id }, { status: st }, function (er, req) {
          if (er) {
            res.status(500).json({ status: false, message: er });
          } else {
            var user = req.userId == fr["user"] ? fr["partner"] : fr["user"];
            sendPushNotification(
              user,
              "Gym Date Request",
              " Gym Pair Request Responded."
            );
            res.status(200).json({
              status: true,
              message: "Request responded successfully.",
            });
          }
        });
      } else if (!fr) {
        res
          .status(404)
          .json({ status: false, message: "Request record not found" });
      }
    }
  });
});

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
              console.log(response.data);
            })
            .catch(function (error) {
              console.log(error);
            });
        }
      }
    });
}

var saveNotification = function (type, sender, receiver) {
  User.findOne({ _id: sender }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: 2,
        user: sender,
        receiver: receiver,
        content: "Send a Gympair Request",
        is_accepted: false,
      });
      not.save();
    }
  });
};

module.exports = router;
