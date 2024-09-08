const Wallet = require('../../models/walletSchema')

module.exports={

    getWallet : async(req,res) =>{
        try {
            res.render("user/wallet", {user: req.session.user})
        } catch (error) {
            
        }
    }

}