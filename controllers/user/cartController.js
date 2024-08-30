const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");

const handleCartUpdate = async (req, res, operation) => {
  try {
    const userID = req.session.user;
    const { id: productId, variant: variantId } = req.params;

    // Input validation
    if (!productId || !variantId) {
      return res.status(400).json({ success: false, message: "Product ID and Variant ID are required" });
    }

    const cart = await Cart.findOne({ userId: userID });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId && item.variantId.toString() === variantId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    const item = cart.items[itemIndex];

    // Check stock early
    const product = await Product.findById(productId).populate("variants");
    const variant = product.variants.find((v) => v._id.toString() === variantId);
    const stock = variant.stock;

    if (isNaN(stock) || stock <= 0) {
      return res.status(400).json({ success: false, message: "Invalid stock value" });
    }

    const incrementOrDecrement = operation === "increment";
    let updatedQuantity;

    // Handle quantity limits
    if (incrementOrDecrement && item.quantity >= stock) {
      return res.status(400).json({ success: false, message: "Quantity exceeds product stock" });
    } else if (!incrementOrDecrement && item.quantity <= 1) {
      return res.status(400).json({ success: false, message: "Cannot decrease quantity below 1" });
    }

    updatedQuantity = incrementOrDecrement ? item.quantity + 1 : item.quantity - 1;

    // Ensure price is treated as a number
    const price = Number(item.price);
    if (isNaN(price)) {
      return res.status(400).json({ success: false, message: "Invalid price value" });
    }

    const itemTotal = price * updatedQuantity;
    if (isNaN(itemTotal)) {
      return res.status(400).json({ success: false, message: "Invalid itemTotal value" });
    }

    cart.items[itemIndex].quantity = updatedQuantity;
    cart.items[itemIndex].itemTotal = itemTotal;

    // Recalculate total price
    const totalPrice = cart.items.reduce((total, prod) => total + Number(prod.itemTotal), 0);
    cart.totalPrice = totalPrice;

    await cart.save();

    return res.status(200).json({ success: true, cart: cart.items[itemIndex], totalPrice });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getCart: async (req, res) => {
    try {
      const userId = req.session.user;
      console.log(req.session.user);
      let cart = await Cart.findOne({ userId }).populate("items.productId items.colorId items.sizeId");

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
          prod.price = prod.productId.onOffer ? prod.productId.offerDiscountPrice : prod.productId.sellingPrice;

          const itemTotal = prod.price * prod.quantity;
          prod.itemTotal = itemTotal;
          totalPrice += itemTotal;
          totalPriceBeforeOffer += prod.price;
        }
        cart.totalPrice = totalPrice;
        cart.payable = totalPrice;

        // if category offer is active or product offer is active

        for (const item of cart.items) {
          const products = await Product.findById(item.productId);

          const product = await Product.findOne({
            _id: item.productId,
          }).populate("variants variants.color variants.size");

          if (!product) {
            console.log(`The Product ${item.productId} is not found!!`);
            errors.push(`The Product ${item.productId} is not found!!`);
            continue;
          }

          if (!product.isActive) {
            console.log(`The Product ${product.name} is not available!!`);
            errors.push(`The Product ${product.name} is not available!!`);
            continue;
          }

          if (!products.variants) {
            console.log(`The Variant of Product ${product.name} is not found!!`);
            errors.push(`The Variant of Product ${product.name} is not found!!`);
            continue;
          }

          const variant = products.variants.find((v) => v?._id?.toString() === item.variantId?.toString());

          const stock = variant?.stock;
          if (item.quantity > stock) {
            item.outOfStock = true;
            console.log(`The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
            errors.push(`The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
          }
        }
        await cart.save();
      }

      let shipmentFee = 50;
      cart.shipmentFee = shipmentFee;

      await cart.save();

      res.render("user/cart", {
        cartList: cart.items,
        cartCount: cart.items.length,
        totalPrice,
        shipmentFee,
        errorMsg: errors,
        user: req.session.user,
      });
    } catch (error) {
      console.error("this is a fantastic error", error);
      res.status(500).json({ error: "An error occurred while fetching the cart." });
    }
  },

  addToCart: async (req, res) => {
    try {
      const { productId, colorId, sizeId, quantity, price } = req.body;

      // Find the user's cart (or create a new one if it doesn't exist)
      let cart = await Cart.findOne({ userId: req.session.user });

      if (!cart) {
        cart = new Cart({ userId: req.session.user });
      }

      const product = await Product.findById(productId).populate("variants.color").populate("variants.size").populate("variants.stock");

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const selectedVariant = product.variants.find((variant) => variant.color._id.toString() === colorId && variant.size._id.toString() === sizeId);

      if (!selectedVariant) {
        return res.status(404).json({ success: false, message: "Variant not found" });
      }

      const variantId = selectedVariant._id;

      const existingCartItem = cart.items.find(
        (item) => item.productId.toString() === productId && item.colorId.toString() === colorId && item.sizeId.toString() === sizeId
      );

      console.log(existingCartItem);

      if (existingCartItem) {
        existingCartItem.quantity = Number(existingCartItem.quantity) + Number(quantity);
        existingCartItem.itemTotal = Number(existingCartItem.quantity) * Number(existingCartItem.price);
      } else {
        cart.items.push({
          productId,
          variantId: variantId,
          colorId: colorId,
          sizeId: sizeId,
          quantity,
          price,
          itemTotal: quantity * price,
        });
      }

      await cart.save();

      res.json({ message: "Product added to cart", count: cart.items.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error adding product to cart" });
    }
  },

  removeCartItem: async (req, res) => {
    try {
      const userId = req.session.user;
      const productId = req.body.productId;

      const cart = await Cart.findOne({ userId }).populate("items.productId");

      const itemIndex = cart.items.findIndex((item) => {
        item.productId.toString() === productId;
      });

      cart.items.splice(itemIndex, 1);
      await cart.save();

      res.status(200).json({ message: "Item removed from the cart successfully" });
    } catch (error) {
      res.status(500).json({ error: "An error occured while deleting the product" });
    }
  },

  incrementCartItem: async (req, res) => {
    handleCartUpdate(req, res, "increment"); // For increment
  },

  decrementCartItem: async (req, res) => {
    handleCartUpdate(req, res, "decrement"); // For decrement
  },

  getOrderSuccess: async (req, res) => {
    let userId = req.session.user;
    let user = await User.findById(userId);
    let order = await Order.aggregate([
      {
        $match: {
          customerId: userId,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: 1,
      },
    ]);
    let orderId = order[0]?._id?.toString()?.slice(-7)?.toUpperCase();

    res.render("user/orderConfirm", {
      order: orderId,
      user,
    });
  },
};
