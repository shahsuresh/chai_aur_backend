import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videos",
      required: true,
    },

    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comments",
    },

    likedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tweets",
    },
  },
  { timestamps: true }
);

const Like = mongoose.model("Like", likeSchema);

export default Like;
