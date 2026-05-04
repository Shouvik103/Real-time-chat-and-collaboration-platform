const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat');
const { Message } = require('./src/models/message.model');

async function run() {
  const msg = await Message.findOne({});
  if (msg) {
    console.log("Raw doc:");
    console.log(msg);
    console.log("toJSON doc:");
    console.log(JSON.stringify(msg));
  } else {
    console.log("No messages");
  }
  process.exit(0);
}
run();
