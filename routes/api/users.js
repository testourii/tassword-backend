const express = require("express");
const { Role, Status } = require("../../constants");
const { check, validationResult } = require("express-validator");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");
const passport = require("passport");
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
const router = express.Router();

// @route  POST api/users
// @desc   Register User
// @access PUBLIC

router.post(
  "/",
  [
    check("firstName", "First name is required").not().isEmpty(),
    check("lastName", "Last name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("role", "please include a valid role")
      .optional({ nullable: true })
      .isIn(Role),
    check("status", "please include a valid status")
      .optional({ nullable: true })
      .isIn(Status),
    check("password", "Password must be at least 8 characters long").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role, status } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "email already exists" }] });
      }
      // Get users gravatar
      const avatar = gravatar.url(email, {
        s: "200",
        r: "pg",
        d: "mm",
      });

      user = new User({
        firstName,
        lastName,
        email,
        password,
        avatar,
        role: undefined,
        status: undefined,
      });
      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user = await user.save();
      // return res.send("user registred");
      // Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
          role: user.role,
        },
      };

      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      return res.status.send("Server error");
    }
  }
);

// @route  PUT api/users/me
// @desc   update  own account
// @access private
router.put(
  "/me",
  upload.single("avatar"),
  [
    check("email", "please include a valid email")
      .optional({ nullable: true })
      .isEmail(),
  ],

  passport_authenticate_jwt_user(async function (req, res, next) {
    try {
      req.body = JSON.parse(req.body.body);
      const id = req.user.id;
      let user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ msg: "user does not exist" });
      }
      if (Object.keys(req.body).length === 0 && !req.file) {
        return res.status(400).json({ msg: "no parameters to change" });
      }
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
      //console.log(req);
      // await passwordd.save();
      res.json(user);
    } catch (err) {
      console.error(err.stack);
      res.status(500).send("server error");
    }
  })
);

module.exports = router;

// function to custom  error message
function passport_authenticate_jwt_user(callback) {
  function authenticateJwt(req, res, next) {
    passport.authenticate("user", function (err, user, info) {
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
