import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

//?=======Schema for Video Table============
const videoSchema = new mongoose.Schema(
  {
    videoFiles: {
      type: String, // cloudinary url
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);

//?=====To add your plugins=============

videoSchema.plugin(mongooseAggregatePaginate);
//?=====exporting Video model===========
export default Video;
