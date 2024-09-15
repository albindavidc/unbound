const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const reportSchema = new Schema(
  {
    currentStatus: {
      type: String,
      enum: [Daily, Monthly, Yearly, Custom],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
