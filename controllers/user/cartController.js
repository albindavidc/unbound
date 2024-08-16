const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");

module.exports = {
  getCart: async (req, res) => {
    // if (!req.isAuthenticated()) {
    //   return res.status(401).json({ error: "Please log in to view cart." });
    // }

    try {
      const userId = req.session.user;
      let cart = await Cart.findOne({ userId }).populate(
        "items.product_id items.color items.size"
      );
      
      // console.log(cart);
      
      let errors = [];
      let totalPrice = 0;
      if (!cart) {
        cart = new Cart({
          userId,
          items: [],
        });
        totalPrice = 0;
      }else {

        let totalPriceBeforeOffer = 0;
        for (const prod of cart.items) {
          prod.price = prod.product_id.onOffer
            ? prod.product_id.offerDiscountPrice
            : prod.product_id.sellingPrice;
  
          const itemTotal = prod.price * prod.quantity;
          prod.itemTotal = itemTotal;
          totalPrice += itemTotal;
          totalPriceBeforeOffer += prod.price;
        }
  
        cart.totalPrice = totalPrice;
        cart.payable = totalPrice;
  
        // if category offer is active or product offer is active
  

        for (const item of cart.items) {
          const product = await Product.findOne({
            _id: item.product_id,
          }).populate("variants.color variants.size");
  
          if (!product) {
            console.log(`The Product ${item.product_id} is not found!!`);
            errors.push(`The Product ${item.product_id} is not found!!`);
            continue;
          }
  
          if (!product.isActive) {
            console.log(`The Product ${product.product_name} is not available!!`);
            errors.push(`The Product ${product.product_name} is not available!!`);
            continue;
          }
  
          const variant = product.variants.find(
            (v) => v._id.toString() === item.variant.toString()
          );
  
          if (!variant) {
            console.log(
              `The Variant of Product ${product.product_name} is not found!!`
            );
            errors.push(
              `The Variant of Product ${product.product_name} is not found!!`
            );
            continue;
          }
  
          const stock = variant.stock;
          if (item.quantity > stock) {
            item.outOfStock = true;
            console.log(
              `The Product ${product.product_name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`
            );
            errors.push(
              `The Product ${product.product_name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`
            );
          }
        }
        await cart.save();
        // Assuming totalPrice is needed for the response
      }

      res.render("user/cart", {
        cartList: cart.items,
        cartCount: cart.items.length,
        totalPrice,
        errorMsg: errors,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching the cart." });
    }
  },

};