// addressSchema.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const addressSchema = new Schema(
  {
    customerId: {
      type: ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    addressType: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    zipcode: {
      type: Number,
      required: true,
    },
    locality: {
      type: String,
      required: true,
    },
    houseName: {
      type: String,
      required: true,
    },
    areaStreet: {
      type: String,
      required: true,
    },
    town: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    alternativePhone: {
      type: String,
    },
    landmark: {
      type: String,
      required: true,
    },
    delete: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Address", addressSchema);
