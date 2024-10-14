// walletController.js

const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");

// Razorpay
const Razorpay = require("razorpay");
const crypto = require("crypto");

var instance = new Razorpay({
  key_id: process.env.RAZ_KEY_ID,
  key_secret: process.env.RAZ_KEY_SECRET,
});

const createRazorpayOrder = async (order_id, total) => {
  try {
    let options = {
      amount: total * 100, // amount in the smallest currency unit
      currency: "INR",
      receipt: order_id.toString(),
    };
    const order = await instance.orders.create(options);
    return order;
  } catch (error) {
    throw new Error("Failed to create Razorpay order");
  }
};

module.exports = {
  // Get Wallet
  getWallet: async (req, res) => {
    const userId = req.session.user;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      const newWallet = new Wallet({
        userId: userId,
        balance: 10,
        transactions: [
          {
            message: "Sign in bonus",
            amount: 10,
            type: "Credit",
          },
        ],
      });

      await newWallet.save();
    }
    try {
      res.render("user/wallet", { user: req.session.user, wallet });
    } catch (error) {}
  },

  // Add to Wallet
  addToWallet: async (req, res) => {
    try {
      const { amount } = req.body;
      const id = crypto.randomBytes(8).toString("hex");
      const payment = await createRazorpayOrder(id, amount);

      const user = await User.findOne({ _id: req.session.user });

      if (!payment) {
        return res.status(500).json({ success: false, message: "Failed to create payment" });
      }

      res.json({ success: true, payment, user });
    } catch (error) {
      const { message } = error;
      res.status(500).json({ success: false, message });
    }
  },

  verifyPayment: async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body.response;
    const secret = process.env.RAZ_KEY_SECRET;
    const { amount } = req.body.order;
    const userId = req.session.user;

    try {
      const hmac = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

      const isSignatureValid = hmac === razorpay_signature;

      if (isSignatureValid) {
        const wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
          const newWallet = new Wallet({
            userId,
            balance: Math.ceil(amount / 100),
            transactions: [
              {
                date: new Date(),
                amount: Math.ceil(amount / 100),
                message: "Initial deposit",
                type: "Credit",
              },
            ],
          });
          await newWallet.save();
          return res.status(200).json({ success: true, message: "Wallet created successfully" });
        } else {
          wallet.balance += Math.ceil(amount / 100);
          wallet.transactions.push({
            date: new Date(),
            amount: Math.ceil(amount / 100),
            message: "Money added to wallet from Razorpay",
            type: "Credit",
          });

          await wallet.save();
          return res.status(200).json({
            success: true,
            message: "Money added to wallet successfully",
          });
        }
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};
