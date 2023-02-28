require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
// var encrypt = require('mongoose-encryption');
// var md5 = require("md5");
// var bcrypt = require("bcrypt");
// const saltRounds = 4;
var session = require("express-session");
var passport = require("passport");
var passportLocalMongoose = require("passport-local-mongoose");

var GoogleStrategy = require('passport-google-oauth20').Strategy;

const findOrCreate = require("mongoose-findorcreate");

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret: "Our long little string secret key.",
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.set('strictQuery', false);
const MONGODB_URL = "mongodb+srv://niyatit:abcd@cluster0.oba68wb.mongodb.net/Secrets?retryWrites=true&w=majority"



mongoose.connect(MONGODB_URL)
.then(()=>{
  console.log("Connected to MongoDB");
})
.catch((err)=>{
  console.log(err);
});


const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
});

const secretSchema = new mongoose.Schema({
  secret: String
});

// mongoose.set("useCreateIndex", true);
userSchema.plugin(passportLocalMongoose);
// var secret = process.env.SECRET_KEY;
// userSchema.plugin(encrypt, { secret : secret, encryptedFields: ['password'] });
userSchema.plugin(findOrCreate);

const User = new mongoose.model("user", userSchema);
const Secret = new mongoose.model("secret", secretSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id); 
 // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
      done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://mysecrets.onrender.com/auth/google/secrets",
  // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", function(req,res){
  res.render("home");
});

app.get("/auth/google", 
  passport.authenticate("google", {scope : ['profile']}));

app.get("/auth/google/secrets", 
  passport.authenticate("google", {failureRedirect: '/login'}),
  function(req,res){
    res.redirect("/secrets");
});

 app.get("/login", function(req,res){
   res.render("login");
 });
 app.get("/register", function(req,res){
   res.render("register");
 });

app.get("/secrets", function(req,res){
  if(req.isAuthenticated()){
    Secret.find({}, function(err, result){
      if(err) console.log(err);
      else{
        res.render("secrets", {list:result});
      }
    });
  } else{
    res.redirect("/login");
  }
});

app.get("/submit", function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req,res){
  const tempSecret = req.body.secret;
 Secret.create({
    secret: tempSecret
  });
  // Secret.save();
  res.redirect("/secrets");
});

app.post("/register", function(req,res){
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // Store hash in your password DB.
    User.register(new User({username: req.body.username, password: req.body.password}), req.body.password, function(err, user){
      if(err){
          console.log(err);
          return res.render("register");
      }
      passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
      });
  });
    
    // const newUser = new User({
    //   email : req.body.username,
    //   // password: md5(req.body.password)
    //   // password: hash
    // });
    // newUser.save(function(err){
    //   if(err){
    //     console.log(err);
    //   }else{
    //     console.log("captured details");
    //     res.render("secrets");
    //   }
    // });
  });
// });

app.post("/login", passport.authenticate("local", {
  successRedirect: '/secrets',
  failureRedirect: '/login'
}), function(req, res){

});
// app.post("/login", function(req,res){
//   req.login(User, function(err){
//     if(err){
//       console.log(err);
//     } else {
//       passport.authenticate("local")(req, res, function(){
//         res.redirect("/secrets");
//       });
//     }
//   });
// });
  //  function(req,res){
  // const user = new User({
  //   username: req.body.username,
  //   password: req.body.password
  // });
  // req.login(user, function(err){
  //   if(err) console.log(err);
  //   else{
  //     passport.authenticate("local")(req,res, function(){
  //       res.redirect("/secrets");
  //     })
  //   }
  // })
  // const username = req.body.username;

  // const password = md5(req.body.password);
  // User.findOne({email: username}, function(err, foundUser){
  //   if(err) console.log(err);
  //   else{
  //     if(foundUser){
  //       // bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
  //       //   if(err) console.log("incorrect password");
  //       //     if(result){
  //       //       res.render("secrets");
  //       //     }
  //       // });
  //     }
  //   }
  // });
// });
app.get("/logout", function(req, res){
    req.logout(function(err) {
      if (err) { return next(err); }
    res.redirect("/");
});
});
 app.listen(3000, function(req,res){
   console.log("server started on port 3000");
 })
