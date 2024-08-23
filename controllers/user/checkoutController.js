const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const crypto = require('crypto');


const mongoose = require("mongoose");

// Function to check if a product exists and is active
const checkProductExistence = async (cartItem) => {
  const product = await Product.findById(cartItem.productId._id);
  if (!product || !product.isActive) {
    throw new Error(`${product.product_name}`);
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

// async function assignUniqueOrderIDs(items) {
//   for (const item of items) {
//     let isUnique = false;
//     while (!isUnique) {
//       const generatedOrderID = generateOrderID();
//       const existingOrder = await Order.findOne({
//         "items.orderID": generatedOrderID,
//       });
//       if (!existingOrder) {
//         item.orderID = generatedOrderID;
//         isUnique = true;
//       }
//     }
//   }
// }

// let orderCounter = 0;

// function generateOrderID() {
//   const date = new Date();
//   const year = date.getFullYear().toString().slice(-2); // Last two digits of the year
//   const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Month as two digits
//   const day = date.getDate().toString().padStart(2, "0"); // Day as two digits

//   // Increment and format the counter part
//   orderCounter = (orderCounter + 1) % 1000; // Resets every 1000
//   const counterPart = orderCounter.toString().padStart(3, "0");

//   return `ODR${year}${month}${day}${counterPart}`;
// }

module.exports = {
  getCheckout: async (req, res) => {
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
      customerId: userId,
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

    res.render("user/checkout", {
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
      // const generateOrderId = () => {
      //   const timestamp = Date.now().toString(36); // Convert current time to a base-36 string
      //   const randomString = Math.random().toString(36).substring(2, 10); // Generate a random base-36 string
      //   return `${timestamp}-${randomString}`; // Combine both for a unique order ID
      // };

      // const assignUniqueOrderIDs = async (items) => {
      //   items.forEach((item) => {
      //     item.orderId = generateOrderId(); // Assign the generated order ID
      //   });
      // };

      // const createOrder = async (order) => {
      //   // const order = new Order(order);

      //   if (!order.orderId) {
      //     order.orderId = uuidv4();
      //   }

      //   await order.save();
      //   return order;
      // };

      const generateUniqueId = () => {
        const timestamp = Date.now().toString(36); // Convert current time to base 36
        const randomStr = Math.random().toString(36).substr(2, 9); // Generate a random string
        return `${timestamp}-${randomStr}`; // Combine both
    };
    

      const { paymentMethod, address } = req.body;

      const userId = req.session.user;
      console.log("eeeeeeeeeeeeeeeee", req.body);

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

      if (!req.body.address) {
        return res.status(400).json({ status: false, message: "Please add the address" });
      }

      const user = await User.findById(userId);
      let userCart = await Cart.findOne({ userId: userId });

      if (!userCart) {
        return res.status(404).json({ error: "User's cart not found" });
      }

      const status = paymentMethod == "COD" ? "Confirmed" : "Pending";
      const paymentStatus = paymentMethod == "COD" ? "Paid" : "Pending";

      console.log("hhhhhhhhhhhhhhhhhhhh", userCart.items);

      console.log("hjjjjjjjjjjjjjjjjjjjjjj", req.body.items);

      // const uniqueId = await generateUniqueId();  // Generate the unique ID for the order


      let order = new Order({
        customerId: userId,
        // orderId: uniqueId, // This should resolve to a string, not a promise
        items: userCart.items,
        totalPrice: userCart.totalPrice,
        payable: userCart.payable,
        paymentMethod,
        paymentStatus,
        status,
        shippingAddress,
      });

      console.log("these are the orders:", order);

      order.items.forEach((item) => {
        item.status = status;
      });

      

      // await assignUniqueOrderIDs(order.items);

      order.status = paymentMethod == "COD" ? "Confirmed" : "Pending";

      // await assignUniqueOrderIDs(order.items).catch((error) => {
      //   console.error(error);
      //   return res.status(500).json({ error: "Failed to assign unique order IDs" });
      // });

      switch (paymentMethod) {
        case "COD":
          if (!order) {
            return res.status(500).json({ error: "Failed to create order" });
          }

          // Save the order
          const orderPlaced = await order.save();
          req.session.orderDetails = orderPlaced; // Store order details in session

          if (orderPlaced) {
            // // reduce stock of the variant
            // Assuming this is part of your checkout process after an order is placed
            for (const item of userCart.items) {
              // Find the product by ID
              const product = await Product.findById(item.productId);

              if (!product) {
                return res.status(404).json({ error: "Product not found" });
              }

              // Find the variant based on size and color (assuming these are stored in sizeId and colorId)
              const variant = product.variants.find(
                (variant) => variant.size.toString() === item.sizeId.toString() && variant.color.toString() === item.colorId.toString()
              );

              // If the variant is not found, return an error
              if (!variant) {
                return res.status(404).json({ error: "Variant not found" });
              }

              // Check if there's enough stock
              if (variant.stock < item.quantity) {
                return res.status(400).json({ error: "Insufficient stock" });
              }

              console.log("this is product", product);
              console.log("this is variant", variant);
              console.log("this is stock", variant.stock);
              console.log("this is the quantity", item.quantity);
              // Reduce the stock by the quantity in the cart
              variant.stock -= item.quantity;

              // Save the updated product
              await product.save();
            }

            // Proceed with the rest of the checkout process here

            const userId = req.session.user;

            await Cart.clearCart(userId);

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

      res.status(400).json({ message: "Detailed error message" });

      console.log("ddddddddddddddddddddddddddddddddddd");
      console.log(error.status);
      console.log(error.stack);

      res.status(500).json({ error: "An error occured while placing the order" });
    }
  },
};
