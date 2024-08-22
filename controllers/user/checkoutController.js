const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");

const mongoose = require("mongoose");

// Function to check if a product exists and is active
const checkProductExistence = async (cartItem) => {
  const product = await Product.findById(cartItem.product_id._id);
  if (!product || !product.isActive) {
    throw new Error(`${product.product_name}`);
  }
  return product;
};

// Function to check if the stock is sufficient for a productExistencePromisesproduct
const checkStockAvailability = async (cartItem) => {
  const product = await Product.findById(cartItem.product_id._id);
  const variant = product.variants.find((variant) => variant._id.toString() === cartItem.variant.toString());
  if (variant.stock < cartItem.quantity) {
    throw new Error(`${product.product_name}`);
  }
  return product;
};

async function assignUniqueOrderIDs(items) {
  for (const item of items) {
    let isUnique = false;
    while (!isUnique) {
      const generatedOrderID = generateOrderID();
      const existingOrder = await Order.findOne({
        "items.orderID": generatedOrderID,
      });
      if (!existingOrder) {
        item.orderID = generatedOrderID;
        isUnique = true;
      }
    }
  }
}

let orderCounter = 0;

function generateOrderID() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2); // Last two digits of the year
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Month as two digits
  const day = date.getDate().toString().padStart(2, "0"); // Day as two digits

  // Increment and format the counter part
  orderCounter = (orderCounter + 1) % 1000; // Resets every 1000
  const counterPart = orderCounter.toString().padStart(3, "0");

  return `ODR${year}${month}${day}${counterPart}`;
}

module.exports = {
  getCheckout: async (req, res) => {
    // const locals = {
    //   title: "Unbound - Checkout",
    // };

    // if (!req.isAuthenticated()) {
    //   return res.redirect("/login");
    // }

    const userId = req.session.user;

    const userCart = await Cart.findOne({ userId: userId }).populate("items.productId items.colorId items.sizeId");
    // if (!userCart) {
    //   return res.redirect("/cart");
    // }
    // if (!userCart.items.length > 0) {
    //   return res.redirect("/cart");
    // }

    let user = await User.findById(userId);

    // Correctly use map with async functions
    const productExistencePromises = userCart.items.map((item) => checkProductExistence(item));
    const productExistenceResults = await Promise.allSettled(productExistencePromises);

    // Filter out the rejected promises to identify which items are not valid
    const invalidCartItems = productExistenceResults.filter((result) => result.status === "rejected").map((result) => result.reason);

    // if (invalidCartItems.length > 0) {
    //   console.log(invalidCartItems);
    //   req.flash("error", `The following items are not available: ${invalidCartItems.join(", ").replaceAll("Error:", "")}`);

    //   return res.redirect("/cart");
    // }

    // Correctly use map with async functions
    const stockAvailabilityPromises = userCart.items.map((item) => checkStockAvailability(item));
    const stockAvailabilityResults = await Promise.allSettled(stockAvailabilityPromises);

    // Filter out the rejected promises to identify which items have insufficient stock
    const insufficientStockItems = stockAvailabilityResults.filter((result) => result.status === "rejected").map((result) => result.reason);

    // if (insufficientStockItems.length > 0) {
    //   console.log(insufficientStockItems);
    //   req.flash("error", `Insufficient stock for the following items: ${insufficientStockItems.join(", ").replaceAll("Error: ", "")}`);

    //   return res.redirect("/cart");
    // }

    const address = await Address.find({
      customer_id: userId,
      delete: false,
    });

    let totalPrice = 0;
    let totalPriceBeforeOffer = 0;
    for (const prod of userCart.items) {
      prod.price = prod.productId.onOffer ? prod.productId.offerDiscountPrice : prod.productId.sellingPrice;

      const itemTotal = prod.price * prod.quantity;
      prod.itemTotal = itemTotal;
      totalPrice += itemTotal;
      totalPriceBeforeOffer += prod.price;
    }




    // Correctly calculate cartCount
    let cartCount = userCart.items.length;



    let isCOD = true;

    if (totalPrice > 1000) {
      isCOD = false;
    }


    res.render("user/checkout", {
    //   locals,
      user,
      address,
      userCart,
      isCOD,
      cartList: userCart.items,
      cartCount,
      totalPrice,
      checkout: true,
    });
  },
  placeOrder: async (req, res) => {
    try {
      const { paymentMethod, address } = req.body;

      console.log(req.body);

      let shippingAddress = await Address.findOne({
        _id: address,
      });

      shippingAddress = {
        name: shippingAddress.name,
        house_name: shippingAddress.house_name,
        locality: shippingAddress.locality,
        area_street: shippingAddress.area_street,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        landmark: shippingAddress.landmark,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipcode: shippingAddress.zipcode,
        address: `${shippingAddress.name}, ${shippingAddress.house_name}(H),  ${shippingAddress.locality}, ${shippingAddress.town}, ${shippingAddress.state}, PIN: ${shippingAddress.zipcode}. PH: ${shippingAddress.phone}`,
      };

      if (!req.body.address) {
        return res.status(400).json({ status: false, message: "Please add the address" });
      }
      if (!req.body.paymentMethod) {
        return res.status(400).json({ status: false, message: "Please select a payment method" });
      }

      // const user = await User.findById(req.user.id).catch((error) => {
      //   console.error(error);
      //   return res.status(500).json({ error: "Failed to find user" });
      // });

      // if (!user) {
      //   return res.status(404).json({ error: "User not found" });
      // }

      let userCart = await Cart.findOne({ userId: req.session.user })

      if (!userCart) {
        return res.status(404).json({ error: "User's cart not found" });
      }
      const status = paymentMethod == "COD" || paymentMethod == "Wallet" ? "Confirmed" : "Pending";
      const paymentStatus = paymentMethod == "COD" || paymentMethod == "Wallet" ? "Paid" : "Pending";

      console.log(userCart.items);

      let order;

      if (userCart.coupon) {
        order = new Order({
          customerId: req.session.user,
          items: userCart.items,
          totalPrice: userCart.totalPrice,
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
          customer_id: user._id,
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
      // order.status = paymentMethod == "COD" ? "Confirmed" : "Pending";
      await assignUniqueOrderIDs(order.items).catch((error) => {
        console.error(error);
        return res.status(500).json({ error: "Failed to assign unique order IDs" });
      });

      switch (paymentMethod) {
        case "COD":
          if (!order) {
            return res.status(500).json({ error: "Failed to create order" });
          }

          // Save the order
          const orderPlaced = await order.save();

          if (orderPlaced) {
            // if coupon is used
            if (order.coupon) {
              await Coupon.findOneAndUpdate({ _id: userCart.coupon }, { $push: { usedBy: { userId: req.user.id } } });
            }

            // reduce stock of the variant
            for (const item of userCart.items) {
              const product = await Product.findById(item.product_id).catch((error) => {
                console.error(error);
                return res.status(500).json({ error: "Failed to find product" });
              });

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              const variantIndex = product.variants.findIndex((variant) => variant._id.toString() === item.variant.toString());

              if (variantIndex === -1) {
                return res.status(404).json({ error: "Variant not found" });
              }

              console.log(product.variants[variantIndex]);

              product.variants[variantIndex].stock -= item.quantity;

              await product.save().catch((error) => {
                console.error(error);
                return res.status(500).json({ error: "Failed to update product stock" });
              });
            }

            await Cart.clearCart(req.user.id).catch((error) => {
              console.error(error);
              return res.status(500).json({ error: "Failed to clear user's cart" });
            });

            // coupon is used
            if (order.coupon) {
              await Coupon.findOneAndUpdate({ _id: userCart.coupon }, { $push: { usedBy: { userId: req.user.id } } });
            }

            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          }

          break;

        default:
          return res.status(400).json({ error: "Invalid payment method" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occured while placing the order" });
    }
  },
};
