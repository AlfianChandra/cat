import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { User } from '../models/user.model.js';
dotenv.config();
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const checkUser = await User.findOne({ email: email });
  if (!checkUser)
  {
    console.log(done)
    return done(null, true, { code: 404, name:profile.displayName, email: profile.emails[0].value });
  }
  
  if (checkUser.google_signin == false)
  {
    return done(null, true, { code: 401, linked:false });  
  }
  const user = {
    id: profile.id,
    name: profile.displayName,
    email: profile.emails[0].value,
    avatar: profile.photos[0].value,
    _id: checkUser._id,
  };
  return done(null, user, {code:200});
}));
