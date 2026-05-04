const mongoose = require('mongoose');
const { Schema } = mongoose;

const s = new Schema({ name: String });
s.set('toJSON', { virtuals: true, transform: (doc, ret) => { ret.id = ret._id.toString(); delete ret._id; } });
const M = mongoose.model('TestMongoose', s);

const m = new M({ name: "hello" });
console.log(JSON.stringify(m));
