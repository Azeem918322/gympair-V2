const joi = require("joi");

/*signupValidation={
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    firstName:Joi.string().required(),
    lastName:Joi.string().required(),
    userName:Joi.string().required(),  
    phoneNumber:Joi.required(),
    referal_code:Joi.string().optional(),
    vaccinated:Joi.boolean().optional(),
    age:Joi.number().optional(),
    height:Joi.number().optional(),
   weight:Joi.number().optional(),
  // gym:Joi.ObjectID().optional(),
   workout:Joi.object({
     workout_type:Joi.string(),
     days:Joi.array().optional(),
     time:Joi.array().optional()
   })
  })
};*/
const redeem = joi.object({
  maskCount: joi.number().required(),
  address: joi.string().required(),
});
const redeemValidator = async (req, res, next) => {
  const payload = {
    maskCount: req.body.maskCount,
    address: req.body.address,
  };

  const { error } = redeem.validate(payload);
  if (error) {
    return res
      .status(406)
      .json({ message: `Missing Fields, ${error.message}`, status: false });
  } else {
    next();
  }
};

const Challenge = joi.object({
  challenge_description: joi.string().required(),
  fitness_level: joi.string().required(),
  challenge_video: joi.string().required(),
});

const challengeValidator = async (req, res, next) => {
  const { error } = Challenge.validate(req.body);
  if (error) {
    return res
      .status(406)
      .json({ message: `Missing Fields, ${error.message}`, status: false });
  } else {
    next();
  }
};

const W_out = joi.object({
  partner: joi.string().required(),
  fitness_level: joi.string().required(),
  // workout_name: joi.string().required(),
  workout_id: joi.string().required(),
  date_time: joi.string().required(),
});

const workoutValidator = async (req, res, next) => {
  const { error } = W_out.validate(req.body);
  if (error) {
    return res
      .status(406)
      .json({ message: `Missing Fields, ${error.message}`, status: false });
  } else {
    next();
  }
};

const workoutChallengeSchema = joi.object({
  challenge_description: joi.string().required(),
  challenge_video: joi.string().optional().allow("", null),
  // challenge_tags: joi.array().items(joi.string()).required(),
  fitness_level: joi.string().optional().allow("", null),
});

const workoutChallengeValidator = async (req, res) => {
  const { error } = workoutChallengeSchema.validate(req.body);
  if (error) {
    return res
      .status(406)
      .json({ message: `Missing Fields, ${error.message}`, status: false })
      .end();
  }
};

const GymDateRequest = joi.object({
  gymInfo: joi.object({
    _title: joi.string().required(),
    address: joi.string().optional().allow("", null),
    latitude: joi.number().required(),
    longitude: joi.number().required(),
    type: joi.number().required(),
  }),
  partnerId: joi.string().required(),
  description: joi.string().required(),
  time: joi.string().required(),
  date: joi.string().required(),
});

const gymDateRequestValidator = async (req, res, next) => {
  const { error } = GymDateRequest.validate(req.body);

  if (error) {
    return res
      .status(406)
      .json({ message: `Missing Fields, ${error.message}`, status: false });
  } else {
    next();
  }
};

module.exports = {
  redeemValidator: redeemValidator,
  Challenge: challengeValidator,
  workout: workoutValidator,
  gymDateRequestValidator: gymDateRequestValidator,
  workoutChallengeValidator: workoutChallengeValidator,
};
