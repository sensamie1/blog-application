const mongoose = require('mongoose');
const UserModel = require('./user-model')


const Schema = mongoose.Schema;

const BlogSchema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    description: { type: String },
    state: {
      type: String, 
      required: true,
      enum: ['draft', 'published', 'deleted'],
      default: 'draft'
    },
    tags: [String],
    body: { type: String, required: true },
    author_id: [{
      type: Schema.Types.ObjectId,
      ref: 'users',
    }],
    author: { type: String },
    read_count: { type: Number, default: 0 },
    reading_time: { type: String, default: '0 min(s)' },
  },
  { timestamps: true }
);

BlogSchema.pre('save', async function (next) {
  try {
    const author = await UserModel.findById(this.author_id);
    if (author) {
      this.author = `${author.first_name} ${author.last_name}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});


const BlogModel = mongoose.model('blogs', BlogSchema);

module.exports = BlogModel;