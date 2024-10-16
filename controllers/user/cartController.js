// cartController.js

const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Customize = require("../../models/customizedProduct");

const handleCartUpdate = async (req, res, operation) => {
  try {
    const userID = req.session.user;
    const { id: productId, variant: variantId } = req.params;

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

    if (stock >= item.quantity) {
      updatedQuantity = incrementOrDecrement ? item.quantity + 1 : item.quantity - 1;
    } else {
      updatedQuantity = stock;
    }

    // Handle quantity limits
    if (incrementOrDecrement && item.quantity >= stock) {
      return res.status(400).json({ success: false, message: `Quantity exceeds product stock. their only ${stock} stocks left`, stock });
    } else if (!incrementOrDecrement && item.quantity <= 1) {
      return res.status(400).json({ success: false, message: "Cannot decrease quantity below 1" });
    } else if (incrementOrDecrement && item.quantity >= product.quantity) {
      return res.status(400).json({ success: false, message: "This is the max order for this order" });
    }

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

    return res.status(200).json({ success: true, cart: cart.items[itemIndex], totalPrice, carts: cart, stock });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  // Get Cart
  getCart: async (req, res) => {
    try {
      const userId = req.session.user;
      let cart = await Cart.findOne({ userId }).populate("items.productId items.colorId items.sizeId items.productId.bundleQuantity");

      let bundleQuantity;
      let sellingPrice;
      let bundlePrice;
      let cartQuantity;

      cart.items.forEach((item) => {
        const product = item.productId;

        cartQuantity = item.quantity;
        if (product) {
          bundleQuantity = product.bundleQuantity;
          sellingPrice = product.sellingPrice;
          bundlePrice = product.bundlePrice;
        }
      });

      for (const cartItems of cart.items) {
        cartItems.productId.variants.forEach(async (item) => {
          if (item.stock < cartItems.quantity) {
            cartItems.quantity = item.stock;
            await cart.save();
          }
        });
      }

      if (cartQuantity >= bundleQuantity) {
        sellingPrice = bundlePrice;
      }

      let totalPriceOfEachProduct = 0;
      let errors = [];
      let totalPrice = 0;
      if (!cart) {
        cart = new Cart({
          userId,
          items: [],
        });
        totalPrice = 0;
      } else {
        for (const prod of cart.items) {
          prod.price = prod.productId.bundleQuantity > prod.quantity ? prod.productId.sellingPrice : prod.productId.bundlePrice;

          const itemTotal = prod.price * prod.quantity;
          prod.itemTotal = itemTotal;
          totalPrice += itemTotal;
          totalPriceOfEachProduct += prod.price;
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
            errors.push(`The Product ${item.productId} is not found!!`);
            continue;
          }

          if (!product.isActive) {
            errors.push(`The Product ${product.name} is not available!!`);
            continue;
          }

          if (!products.variants) {
            errors.push(`The Variant of Product ${product.name} is not found!!`);
            continue;
          }

          const variant = products.variants.find((v) => v?._id?.toString() === item.variantId?.toString());

          const stock = variant?.stock;
          if (item.quantity > stock) {
            item.outOfStock = true;
            errors.push(`The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
          }
        }
        await cart.save();
      }

      let shipmentFee = 50;

      const getPayable = await Cart.findOne({ userId }, { _id: 0, payable: 1 });
      const payable = getPayable.payable;

      if (payable < 1000) {
        cart.shipmentFee = shipmentFee;
        cart.totalPrice += shipmentFee;
        await cart.save();
      }

      await cart.save();

      const getTotalPrice = await Cart.findOne({ userId }, { _id: 0, totalPrice: 1 });
      const totalPrices = getTotalPrice.totalPrice;

      res.render("user/cart", {
        totalPriceOfEachProduct,
        cartList: cart.items,
        cartCount: cart.items.length,
        totalPrice,
        totalPrices,
        shipmentFee,
        payable,
        errorMsg: errors,
        user: req.session.user,
      });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching the cart." });
    }
  },

  // Add Cart
  addToCart: async (req, res) => {
    try {
      const { productId, colorId, sizeId, quantity, price } = req.body;

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

      //Customized Product To Cart
      const userId = req.session.user;
      const customizedProduct = await Customize.findOne({ userId });

      if (customizedProduct && customizedProduct.products.length > 0) {
        const product = customizedProduct.products.find((item) => item.productId.toString() === productId.toString());

        if (product && product.customizedProductOption === true) {
          await Cart.updateOne({ userId, "items.productId": productId }, { $set: { "items.$.customized": true } });
        }
      }
      res.json({ message: "Product added to cart", count: cart.items.length });
    } catch (error) {
      res.status(500).json({ message: "Error adding product to cart" });
    }
  },

  // Remove Cart Item
  removeCartItem: async (req, res) => {
    let productId = req.params.productId;
    let variantId = req.params.variantId;
    let userId = req.session.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res.status(404).json({ status: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex((item) => item.productId._id.toString() === productId && item.variantId.toString() === variantId);

    if (itemIndex === -1) {
      return res.status(404).json({ status: false, message: "Item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);

    // Recalculate the total price after removing the item
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + item.productId.sellingPrice * item.quantity;
    }, 0);

    await cart.save();
    if (cart) {
      res.status(200).json({ success: true, message: `Product remove successfull` });
    } else {
      res.status(404).json({ success: false, message: "Product removal failed" });
    }
  },

  incrementCartItem: async (req, res) => {
    handleCartUpdate(req, res, "increment");
  },

  decrementCartItem: async (req, res) => {
    handleCartUpdate(req, res, "decrement");
  },

  // Order Success
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
