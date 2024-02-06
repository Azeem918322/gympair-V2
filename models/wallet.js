const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const walletSchema = new Schema(
  {
    balance: { type: Number },
    points: { type: Number },
    user: { type: Schema.Types.ObjectId, ref: "gym_member" },
    lastPushSentAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model("wallet", walletSchema);

module.exports = Wallet;
