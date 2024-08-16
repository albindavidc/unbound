const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");

module.exports = {
  getCart: async (req, res) => {
    // if (!req.isAuthenticated() ||!req.session.user) {
    //   return res.status(401).json({ error: "Please log in to view cart." });
    // }

    try {
      const userId = req.session.user;
      console.log(req.session.user);
      let cart = await Cart.findOne({ userId }).populate("items.product_id items.color items.size");

      // console.log(cart);

      let errors = [];
      let totalPrice = 0;
      if (!cart) {
        cart = new Cart({
          userId,
          items: [],
        });
        totalPrice = 0;
      } else {
        let totalPriceBeforeOffer = 0;
        for (const prod of cart.items) {
          prod.price = prod.product_id.onOffer ? prod.product_id.offerDiscountPrice : prod.product_id.sellingPrice;

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

          const variant = product.variants.find((v) => v._id.toString() === item.variant.toString());

          if (!variant) {
            console.log(`The Variant of Product ${product.product_name} is not found!!`);
            errors.push(`The Variant of Product ${product.product_name} is not found!!`);
            continue;
          }

          const stock = variant.stock;
          if (item.quantity > stock) {
            item.outOfStock = true;
            console.log(`The Product ${product.product_name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
            errors.push(`The Product ${product.product_name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
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
        user: req.session.user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while fetching the cart." });
    }
  },

  addToCart: async (req, res) => {
    try {

        console.log(req.body)
      let userId = req.session.user;
      let { productId, variantId, color, size } = req.body;
      const product = await Product.findById(productId).populate("variants");
      if (!product) {
        return res.status(404).json({ status: false, message: "Product not found" });
      }

      //   const variant = product.variants.find(
      //     (v) => v._id.toString() === variantId
      //   );
      //   if (!variant) {
      //     return res
      //       .status(404)
      //       .json({ status: false, message: "Variant not found" });
      //   }

      //   const stock = variant.stock;
      //   if (stock === 0) {
      //     return res
      //       .status(409)
      //       .json({ status: false, message: "Product Out Of Stock" });
      //   }

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        const newCart = new Cart({
          userId,
          items: [
            {
              product_id: productId,
              //   variant: variantId,
              color,
              size,
              quantity: 1,
              price: product.price,
            },
          ],
        });

        await newCart.save();
        return res.json({
          status: true,
          count: 1,
        });
      }

      const itemIndex = cart.items.findIndex((item) => item.product_id.toString() === productId && item.variant.toString() === variantId);

      if (itemIndex !== -1) {
        return res.status(400).json({ status: false, message: "Product already in cart" });
      }

      cart.items.push({
        product_id: productId,
        variant: variantId,
        color,
        size,
        quantity: 1,
        price: product.sellingPrice,
        itemTotal: product.sellingPrice,
      });

      await cart.save();

      return res.json({
        status: true,
        count: cart.items.length,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ status: false, message: "An error occurred" });
    }
  },
};
