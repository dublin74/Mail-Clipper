const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: String,
  displayName: String, 
  accessToken: String,
  refreshToken: String
});

userSchema.statics.findOrCreate = async function findOrCreate(condition, doc) {
  const result = await this.findOneAndUpdate(
    condition,
    doc,
    { upsert: true, new: true }
  );
  return result;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
