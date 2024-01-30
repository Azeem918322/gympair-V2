const jwt = require("jsonwebtoken");
const config = require("../config.js");
const db = require("../models");


const User = db.user;
const Role = db.permission;

verifyToken = (req, res, next) => {

  let token = req.headers["authorization"]? req.headers["authorization"].replace('Bearer ', ''):'';
  //console.log(token);
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  if(token){
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.user;
    next();
  });
}
};


//check creds of login request
loginUser= (req, res, next) => {  
  if (!req.body.Email||!req.body.password||!req.body.TTL) {
    return res.status(403).send({ message: "Incomplete Login Request!" });
  }else{
    next();
  }
  
};

//check authorized user
auth=(req, res, next)=>{
  let token = req.headers["x-access-token"];
  
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }
  if(token){
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      //console.log(err);
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.user;
    User.findOne({_id:decoded.user},'role')
    .exec(function(er,user){
      if(er){
        console.log(er);
      }else{
        Role.findOne({role:user.role})
        .where({$and:[{'scope':{"$elemMatch":{'path':req.baseUrl}}},
          {'scope.method':{"$in":req.method}}]})
        .exec(function(e,p){
          if(er){
        console.log(er);
        }else{
          if(p&&p._id){
            next();
          }else{
            return res.status(401).send({ message: "You are not authorized for this operation." });
          }
        }
        });
      }    
  });
})
}};
//check if user is admin
isAdmin=(req, res, next)=>{
  let token = req.headers["authorization"]? req.headers["authorization"].replace('Bearer ', ''):'';
  
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }
  if(token){
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      //console.log(err);
      return res.status(401).send({ message: "Unauthorized!" });
    }
    User.findOne({_id:decoded.user},'ACL')
    .exec(function(er,user){
      if(er){
        console.log(er);
      }else{
        if(user['ACL']=='admin'){
          next();
        }else{
          return res.status(401).send({ message: "You are not authorized for this operation." });
        }
        
      }    
  });
})
}};



const authJwt = {
  verifyToken,  
  loginUser,
  auth,
  isAdmin
};
module.exports = authJwt;