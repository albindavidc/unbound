const mongoose = require('mongoose');

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const walletSchema = new Schema({
    userId: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            date: {
                type: Date,
                default: Date.now
            },
            amount: {
                type: Number,
                required: true
            },
            message: {
                type: String
            },
            type: {
                type: String,
                required: true,
                enum: ['Credit', 'Debit']
            },
        },
    ]
},{
    timestamps: true
});


module.exports = mongoose.model('Wallet', walletSchema)