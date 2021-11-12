const mongoose = require("mongoose");
const { Role, Status } = require("../constants");

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    enum: Role,
    default: Role.USER,
  },
  status: {
    type: String,
    enum: Status,
    default: Status.INACTIVE,
  },
});

module.exports = User = mongoose.model("user", UserSchema);
