const jwt = require("jsonwebtoken");
const config = require("../config.js");
const db = require("../models");


const User = db.user;

const trackUsers = (req, res, next) => {
 User.estimatedDocumentCount(function (err, count) {
    if (err){
        console.log(err)
    }else{
        console.log("Estimated Count :", count);
        req.body.count=count+1;
        next();
    }
});
};
const validDevice=(req,res,next)=>{
    if(req.body.device_model&&req.body.device_os&&req.body.external_user_id&&req.body.identifier){
        next()
    }else{
        return res.status(500).send({ message: "Incomplete Data." });
    }
}
module.exports = {trackUsers,validDevice};