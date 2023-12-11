const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/user');
const { google } = require('googleapis');
require('dotenv').config()

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.ClIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      passReqToCallback: true
    },
    async function (request, accessToken, refreshToken, profile, done) {
      try {
        let user = await User.findOne({ googleId: profile.id });
      
        if (!user) {
          user = new User({
            googleId: profile.id,
            displayName: profile.displayName,
            accessToken: accessToken,
            refreshToken: refreshToken
          });
        } else {
          user.accessToken = accessToken;
          if (refreshToken) {
            user.refreshToken = refreshToken;
          }
        }
      
        await user.save();
      
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
