const mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt");

const userSchema = new Schema(
  {
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    email: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter a valid email",
      },
    },
    ACL: { type: String }, //
    password: { type: String }, //hashed password
    token: { type: String }, //for google/apple auth
    phoneNumber: { type: String, match: /^(\+65|\d){9}$/ },
    gender: { type: String, enum: ["male", "female", "other"] },
    date_of_birth: { type: Date },
    referal_code: { type: String },
    referal_points: { type: Number },
    vaccinated: { type: Boolean },
    height: { type: Number },
    typeHeight: { type: String },
    typeWeight: { type: String },
    weight: { type: Number },
    //gym_name:String,
    //gym_address:String,

    gym_updated_at: { type: String },
    workout: {
      workout_type: { type: String, enum: ["Casual", "Intense", ""] },
      days: [
        {
          type: String,
          enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
      ],
      time: [{ type: String, enum: ["Morning", "Noon", "Evening"] }],
    },
    profile_picture: { type: String },
    otp: { type: Number },
    otp_created_at: { type: Number },
    password_otp: { type: Number },
    password_otp_created_at: { type: Number },
    followers: [{ type: Schema.Types.ObjectId, ref: "gym_member" }],
    followings: [{ type: Schema.Types.ObjectId, ref: "gym_member" }],
    friends: [{ type: Schema.Types.ObjectId, ref: "friend" }],
    age_start: { type: Number },
    age_end: { type: Number },
    email_otp: { type: Number },
    email_otp_created_at: { type: Number },
    interests: [{ type: String }],
    introduction: { type: String },
    posts: [{ type: Schema.Types.ObjectId, ref: "post" }],
    //latitude:{type: Number},
    //longitude:{type: Number},
    referals: { type: Number },
    generated_code: { type: String },
    mask: { type: Number },
    station_longitude: String,
    station_latitude: String,
    station_name: String,
    liked_to: [{ type: Schema.Types.ObjectId, ref: "gym_member" }], //liked this user
    disliked_to: [{ type: Schema.Types.ObjectId, ref: "gym_member" }], //disliked this user
    liked_by: [{ type: Schema.Types.ObjectId, ref: "gym_member" }], //liked by this user
    disliked_by: [{ type: Schema.Types.ObjectId, ref: "gym_member" }], //disliked by this user
    rewind: {
      action: {
        type: String,
        enum: ["like", "dislike", "unlike", "undislike"],
      },
      user: { type: Schema.Types.ObjectId, ref: "gym_member" },
    },
    rewind_at: { type: Number },
    isGymMember: Boolean,
    canChangeGym: Boolean,
    canChangeStation: Boolean,
    count: Number,
    notificationToken: [{ type: String }],
    gym: [{ type: Schema.Types.ObjectId, ref: "gym" }],
    subscription: { type: Number, enum: [0, 1] }, //0=free,1=pro
    subscriptionExpiry: { type: Number },
    purchaseToken: { type: String },
    productId: { type: String },
    last_login: { type: String },
    social_token: { type: String },
    social_id: { type: String },
    blocklist: [{ type: Schema.Types.ObjectId, ref: "gym_member" }],
    reportedUsers: [{ type: Schema.Types.ObjectId, ref: "gym_member" }],
    is_social: { type: Boolean },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("gym_member", userSchema);

module.exports = User;
