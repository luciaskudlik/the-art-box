const express = require("express");
const authRouter = express.Router();

const bcrypt = require("bcrypt");
const User = require("../models/User.model");
const zxcvbn = require("zxcvbn");

// Helper middleware
const isLoggedIn = require("./../utils/isLoggedIn");
const saltRounds = 10;

//SIGNUP

// GET     /auth/signup   -  Render the Signup form
authRouter.get("/signup", (req, res, next) => {
  res.render("Signup");
});

// POST      /auth/signup    - Receives the data from Signup POST form
authRouter.post("/signup", (req, res, next) => {
  // 1 - Get the values coming from the form:
  //     req.body.username  req.body.password
  const { username, password, email } = req.body;
  console.log(username, password, email);

  // 2 - Check if `username` and `password` are empty and display error message
  if (username === "" || password === "") {
    const props = { errorMessage: "Enter username and password" };

    res.render("Signup", props);
    return;
  }

  if (zxcvbn(password).score < 1) {
    // const suggestions = zxcvbn(password).feedback.suggestions;
    // console.log('suggestions', suggestions);
    // const props = {  errorMessage: suggestions[0] }
    const props = { errorMessage: "Password too weak. Try again!" };
    res.render("Signup", props);
    return;
  }

  //CHECK IF EMAIL ALREADY EXISTS
  User.findOne({ email: email })
    .then((user) => {
      if (user) {
        const props = { errorMessage: "The email already exists" };
        res.render("Signup", props);
        return;
      }
    })
    .catch((err) => console.log(err));

  // 3 - Check the users collection to see if `username` is already taken
  User.findOne({ username: username })
    .then((user) => {
      // > If `username` is already taken, display the error message
      if (user) {
        const props = { errorMessage: "The username already exists" };
        res.render("Signup", props);
        return;
      }

      // > If `username` is available -  encrypt the password
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // After encrypting the password, create the new user in DB
      User.create({
        username: username,
        password: hashedPassword,
        email: email,
      })
        .then((createdUser) => {
          // When the new user is created, redirect to the home page
          //console.log("USER CREATED SUCCESFULLY");
          res.redirect("/auth/login");
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
});

//LOGIN

// GET  /auth/login  - Render the Login form
authRouter.get("/login", (req, res, next) => {
  res.render("Login");
});

// POST     /auth/login   - Receives the data from the POST Login form
authRouter.post("/login", (req, res, next) => {
  const { username, password } = req.body;

  if (username === "" || password === "") {
    const props = {
      errorMessage: "Please enter username and password",
    };

    res.render("Login", props);
    return;
  }

  User.findOne({ username }).then((user) => {
    if (!user) {
      // If the user by the given `username` was not found, send error message
      const props = { errorMessage: "The username doesn't exist" };

      res.render("Login", props);
      return;
    }

    const passwordCorrect = bcrypt.compareSync(password, user.password);

    if (passwordCorrect) {
      // Create the session - which also triggers the creation of the cookie
      req.session.currentUser = user;

      res.redirect("/");
    } else {
      res.render("Login", { errorMessage: "Incorrect password" });
    }
  });
});

//LOGOUT

// GET     /auth/logout
authRouter.get("/logout", isLoggedIn, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      //res.render("Error");
      console.log(err);
      //res.send()
    } else {
      //props = { showLogoutButton: false };
      res.redirect("/auth/login");
    }
  });
});

module.exports = authRouter;
