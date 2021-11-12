const express = require("express");
const { Role, Status } = require("../../constants");
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");
var passport = require("passport");
const router = express.Router();
const fs = require("fs");

const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  //reject a file
  if (file.mimetype == "image/jpeg" || file.mimetype === "image/png")
    cb(null, true);
  else {
    cb(null, false);
  }
  //accept a file
};
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});
// @route  get api/admin/all
// @desc   all users
// @access Private: admin
router.get(
  "/all",
  passport_authenticate_jwt_admin(async function (req, res, next) {
    try {
      const users = await User.find({ role: Role.USER }).select(
        "-password -role"
      );
      return res.json(users);
    } catch (err) {
      console.error(err.message);
      return res.status.send("Server error");
    }
  })
);

// @route  PUT api/admin/user/:id
// @desc   update  a  user
// @access private
router.put(
  "/user/:id",
  upload.single("avatar"),

  [
    check("email", "please include a valid email")
      .optional({ nullable: true })
      .isEmail(),
  ],
  passport_authenticate_jwt_admin(async function (req, res, next) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ msg: "user not found" });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const id = req.params.id;
      let user = await User.findById(id);
      if (user.role === Role.ADMIN) {
        return res.status(400).json({ msg: "unauthorized to modify admin" });
      }
      if (!user) {
        return res.status(404).json({ msg: "user does not exist" });
      }

      if (Object.keys(req.body).length === 0 && !req.file) {
        return res.status(400).json({ msg: "no parameters to change" });
      }
      req.body = JSON.parse(req.body.body);

      const { email, firstName, lastName, status, password } = req.body;
      const user1 = await User.findOne({ email });
      if (user1 && user1.id !== user.id) {
        return res.status(400).json({ msg: "Email already taken" });
      }
      let avatar;
      if (req.file && user.avatar[0] === "u") {
        fs.unlink(user.avatar, (err) => {
          if (err) console.log(err);
          else {
            // console.log("\nDeleted Symbolic Link: symlinkToFile");
          }
        });
      }
      if (req.file) avatar = req.file.path;
      user = await User.findByIdAndUpdate(
        id,
        { $set: { email, firstName, lastName, avatar, status, password } },
        { new: true }
      );

      // await passwordd.save();
      res.json(user);
    } catch (err) {
      console.error(err.stack);
      res.status(500).send("server error");
    }
  })
);

// @route  DELETE api/admin/user/:id
// @desc   Delete user by id
// @access Private: admin
router.delete(
  "/user/:id",
  passport_authenticate_jwt_admin(async function (req, res, next) {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ msg: "user not found" });
    }
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: "user not found" });
      }
      user.remove();
      return res.status(200).json({ msg: "user deleted succefully" });
    } catch (err) {
      console.error(err.message);
      return res.status.send("Server error");
    }
  })
);

module.exports = router;

// function to custom  error message

function passport_authenticate_jwt_admin(callback) {
  function authenticateJwt(req, res, next) {
    passport.authenticate("admin", function (err, user, info) {
      if (err) return next(err);
      if (!user)
        return res.status(401).send({
          error: {
            code: "INVALID_AUTHORIZATION_CODE",
            message: "You are unauthorized",
          },
        });

      req.user = user;
      return callback(req, res, next);
    })(req, res, next);
  }

  return authenticateJwt;
}
