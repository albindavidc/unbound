// checkoutController.js

const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Payment = require("../../models/paymentSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const Customize = require("../../models/customizedProduct");

const mongoose = require("mongoose");

//Razorpay
const Razorpay = require("razorpay");
const crypto = require("crypto");

var instance = new Razorpay({
  key_id: process.env.RAZ_KEY_ID,
  key_secret: process.env.RAZ_KEY_SECRET,
});

// Function to check if a product exists and is active
const checkProductExistence = async (cartItem) => {
  const product = await Product.findById(cartItem.productId._id);
  if (!product || !product.isActive) {
    throw new Error(`${product.name}`);
  }
  return product;
};

// Function to check if the stock is sufficient for a productExistencePromisesproduct
const checkStockAvailability = async (cartItem) => {
  const product = await Product.findById(cartItem.productId._id);
  const variant = product.variants.find((variant) => variant._id.toString() === cartItem.variant.toString());
  if (variant.stock < cartItem.quantity) {
    throw new Error(`${product.name}`);
  }
  return product;
};

const createRazorpayOrder = async (order_id, total) => {
  let options = {
    amount: total * 100,
    currency: "INR",
    receipt: order_id.toString(),
  };
  const order = await instance.orders.create(options);
  return order;
};

module.exports = {
  // Get Checkout
  getCheckout: async (req, res) => {
    const userId = req.session.user;

    const userCart = await Cart.findOne({ userId: userId }).populate(
      "items.productId items.colorId items.sizeId coupon items.quantity items.productId.bundleQuantity"
    );

    let user = await User.findById(userId);

    // Correctly use map with async functions
    const productExistencePromises = userCart.items.map((item) => checkProductExistence(item));
    const productExistenceResults = await Promise.allSettled(productExistencePromises);

    // Filter out the rejected promises to identify which items are not valid
    const invalidCartItems = productExistenceResults.filter((result) => result.status === "rejected").map((result) => result.reason);

    // Correctly use map with async functions
    const stockAvailabilityPromises = userCart.items.map((item) => checkStockAvailability(item));
    const stockAvailabilityResults = await Promise.allSettled(stockAvailabilityPromises);

    // Filter out the rejected promises to identify which items have insufficient stock
    const insufficientStockItems = stockAvailabilityResults.filter((result) => result.status === "rejected").map((result) => result.reason);

    const address = await Address.find({
      customerId: userId,
      delete: false,
    });

    let totalPrice = 0;
    let totalPriceBeforeOffer = 0;

    for (const prod of userCart.items) {
      prod.price = prod.productId.bundleQuantity > prod.quantity ? prod.productId.sellingPrice : prod.productId.bundlePrice;

      const itemTotal = prod.price * prod.quantity;
      prod.itemTotal = itemTotal;
      totalPrice += itemTotal;
      totalPriceBeforeOffer += prod.price;
    }

    // Apply coupon discount if applicable
    let couponDiscount = 0;
    if (userCart.coupon) {
      const coupon = await Coupon.findById(userCart.coupon);
      if (coupon && coupon.isActive && new Date() <= coupon.expiringDate && totalPrice >= coupon.minPurchaseAmount) {
        couponDiscount = totalPrice * (coupon.rateOfDiscount / 100);
        totalPrice -= couponDiscount;

        await Cart.findOneAndUpdate({ _id: userCart._id }, { $set: { totalPrice: totalPrice, couponDiscount: couponDiscount } });
      } 
      // else {
      //   // If the total is less than the minimum purchase amount, remove the coupon
      //   userCart.coupon = undefined;
      //   userCart.couponDiscount = 0;
      //   await userCart.save();
      // }
    }

    // Correctly calculate cartCount
    let cartCount = userCart.items.length;

    const coupons = await Coupon.find({
      isActive: true,
      minPurchaseAmount: { $lte: totalPriceBeforeOffer },
      expiringDate: { $gte: Date.now() },
      // usedBy: [{ $: req.user.id }],
    });

    let isCOD = true;

    if (totalPrice > 1000) {
      isCOD = false;
    }

    const userWallet = await Wallet.find({ userId: userId });

    let newWallet;
    userWallet.forEach((items) => {
      newWallet = items.balance;
    });

    let isInsufficient;
    if (totalPrice > newWallet) {
      isInsufficient = true;
    } else {
      isInsufficient = false;
    }

    const getPayable = await Cart.findOne({ userId }, { _id: 0, payable: 1 });
    const payable = getPayable.payable;

    res.render("user/checkout", {
      user,
      address,
      userCart,
      coupons,
      couponDiscount,
      isCOD,
      cartList: userCart.items,
      cartCount,
      wallet: userWallet,
      totalPrice,
      payable,
      checkout: true,
      isInsufficient,
    });
  },

 

  // Place Order
  placeOrder: async (req, res) => {
    try {
      const { paymentMethod, address } = req.body;

      const userId = req.session.user;
      const user = await User.findById(userId);

      let shippingAddress = await Address.findOne({
        _id: address,
      });

      shippingAddress = {
        name: shippingAddress.name,
        houseName: shippingAddress.houseName,
        locality: shippingAddress.locality,
        areaStreet: shippingAddress.areaStreet,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        landmark: shippingAddress.landmark,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipcode: shippingAddress.zipcode,
        address: `${shippingAddress.name}, ${shippingAddress.houseName}(H),  ${shippingAddress.locality}, ${shippingAddress.town}, ${shippingAddress.state}, PIN: ${shippingAddress.zipcode}. PH: ${shippingAddress.phone}`,
      };

      let userCart = await Cart.findOne({ userId: userId });

      const status = paymentMethod == "COD" || paymentMethod == "Wallet" ? "Confirmed" : "Pending";
      const paymentStatus = paymentMethod === "COD" ? "Pending" : paymentMethod === "Wallet" ? "Paid" : "Pending";

      let order;

      if (userCart.coupon) {
        order = new Order({
          customerId: userId,
          items: userCart.items,
          totalPrice: userCart.totalPrice,
          coupon: userCart.coupon,
          couponDiscount: userCart.couponDiscount,
          payable: userCart.payable,
          paymentMethod,
          paymentStatus,
          status,
          shippingAddress,
        });

        order.items.forEach((item) => {
          item.status = status;
        });
      } else {
        order = new Order({
          customerId: userId,
          items: userCart.items,
          totalPrice: userCart.totalPrice,
          payable: userCart.payable,
          paymentMethod,
          paymentStatus,
          status,
          shippingAddress,
        });
      }

      order.items.forEach((item) => {
        item.status = status;
      });

      order.items.forEach((item) => {
        item.paymentStatus = order.paymentStatus;
      });

      switch (paymentMethod) {
        case "COD":
          // Save the order
          const orderPlaced = await order.save();
          req.session.orderDetails = orderPlaced;

          if (orderPlaced) {
            if (order.coupon) {
              await Coupon.findOneAndUpdate({ _id: userCart.coupon }, { $push: { usedBy: { userId: req.session.user } } });
            }

            for (const item of userCart.items) {
              const product = await Product.findById(item.productId);

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              const variant = product.variants.find(
                (variant) => variant.size.toString() === item.sizeId.toString() && variant.color.toString() === item.colorId.toString()
              );

              if (!variant) {
                return res.status(404).json({ error: "Variant not found" });
              }

              if (variant.stock < item.quantity) {
                return res.status(400).json({ error: "Insufficient stock" });
              }

              variant.stock -= item.quantity;

              item.productDetail = {
                name: product.name,
                color: variant.color.name,
                size: variant.size.value,
                price: product.price,
              };

              await product.save();
            }

            const orderPlaced = await order.save();
            req.session.orderDetails = orderPlaced;

            if (!orderPlaced) {
              return res.status(500).json({ error: "Failed to create order" });
            }

            const userId = req.session.user;

            await Cart.clearCart(userId);

            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          }

          break;

        case "Online":
          const createOrder = await Order.create(order);
          let total = parseInt(userCart.totalPrice);
          let order_id = createOrder._id;

          const RazorpayOrder = await createRazorpayOrder(order_id, total).then((order) => order);

          const timestamp = RazorpayOrder.created_at;
          const date = new Date(timestamp * 1000);

          const formattedDate = date.toISOString();

          let payment = new Payment({
            paymentId: RazorpayOrder.id,
            amount: parseInt(RazorpayOrder.amount) / 100,
            currency: RazorpayOrder.currency,
            orderId: order_id,
            status: RazorpayOrder.status,
            createdAt: formattedDate,
          });
          await payment.save();
          return res.json({
            status: true,
            order: RazorpayOrder,
            user,
          });

          break;

        case "Wallet":
          const orderCreate = await Order.create(order);

          if (orderCreate) {
            let wallet = await Wallet.findOne({ userId: req.session.user });

            wallet.balance = parseInt(wallet.balance) - parseInt(orderCreate.totalPrice);

            wallet.transactions.push({
              date: new Date(),
              amount: parseInt(orderCreate.totalPrice),
              message: "Order placed successfully",
              type: "Debit",
            });

            await wallet.save();

            // reduce stock of the variant
            for (const item of userCart.items) {
              const product = await Product.findById(item.productId).catch((error) => {
                return res.status(500).json({ error: "Failed to find product" });
              });

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              const variantIndex = product.variants.findIndex((variant) => variant._id.toString() === item.variantId.toString());

              if (variantIndex === -1) {
                return res.status(404).json({ error: "Variant not found" });
              }

              product.variants[variantIndex].stock -= item.quantity;

              await product.save().catch((error) => {
                return res.status(500).json({ error: "Failed to update product stock" });
              });
            }

            await Cart.clearCart(req.session.user);

            orderCreate.status = "Confirmed";
            orderCreate.items.forEach((item) => {
              item.status = "Confirmed";
            });

            await orderCreate.save();

            // coupon is used
            if (order.coupon) {
              await Coupon.findOneAndUpdate({ _id: userCart.coupon }, { $push: { usedBy: { userId: req.session.user } } });
            }

            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          }

          break;

        default:
          return res.status(400).json({ error: "Invalid payment method" });
          break;
      }
    } catch (error) {
      res.status(400).json({ message: "Detailed error message" });
    }
  },

  // Verify Payment
  verifyPayment: async (req, res) => {
    try {
      const secret = process.env.RAZ_KEY_SECRET;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body.response;

      let hmac = crypto.createHmac("sha256", secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      hmac = hmac.digest("hex");

      const isSignatureValid = hmac === razorpay_signature;

      if (!isSignatureValid) {
        return res.status(400).json({ success: false, message: "Invalid signature" });
      }

      // Proceed with stock update and order confirmation logic
      let customerId = req.session.user;
      let userCart = await Cart.findOne({ userId: customerId });

      // Reduce the stock of the Variant
      for (const item of userCart.items) {
        const product = await Product.findById(item.productId);

        const variant = product.variants.find(
          (variant) => variant.size.toString() === item.sizeId.toString() && variant.color.toString() === item.colorId.toString()
        );

        if (!variant) {
          return res.status(404).json({ error: "Variant not found" });
        }
        if (variant.stock < item.quantity) {
          return res.status(400).json({ error: "Insufficient stock" });
        }

        variant.stock -= item.quantity;

        await product.save();
      }

      await Cart.clearCart(req.session.user);

      let paymentId = razorpay_order_id;
      const orderID = await Payment.findOne({ paymentId }, { _id: 0, orderId: 1 });

      const order_id = orderID.orderId;
      const updateOrder = await Order.updateOne(
        { _id: order_id },
        { $set: { "items.$[].status": "Confirmed", "items.$[].paymentStatus": "Paid", status: "Confirmed", paymentStatus: "Paid" } }
      );

      let couponId = await Order.findOne({ _id: order_id }).populate("coupon");

      if (couponId.coupon) {
        couponId = couponId.coupon._id;
        if (couponId) {
          let updateCoupon = await Coupon.findByIdAndUpdate(
            { _id: couponId },
            {
              $push: { usedBy: { userId: customerId } },
            },
            {
              new: true,
              upsert: true,
            }
          );
        }
      }

      return res.json({ success: true, message: "Payment verified successfully" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Payment verification failed" });
    }
  },
};
