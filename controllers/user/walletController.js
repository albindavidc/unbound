const Wallet = require("../../models/walletSchema");

module.exports = {
  getWallet: async (req, res) => {
    const userId = req.session.user;
    // Find the wallet for the user
    const wallet = await Wallet.findOne({ userId });

    // If the wallet doesn't exist, create a new one
    if (!wallet) {
      const newWallet = new Wallet({
        userId: userId,
        balance: 10,
        transactions: [
          {
            message: "Sign in bonus",
            amount: 10,
            type: "Credit", // Added type as it is required
          },
        ],
      });

      await newWallet.save();
      console.log("New wallet created for user");
    } else {
      console.log("Wallet already exists for this user");
    }
    try {
        res.render("user/wallet", { user: req.session.user, wallet });
    } catch (error) {}
  },
};
