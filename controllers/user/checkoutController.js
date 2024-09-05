const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const crypto = require("crypto");

const mongoose = require("mongoose");

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



module.exports = {
  getCheckout: async (req, res) => {
    const userId = req.session.user;

    const userCart = await Cart.findOne({ userId: userId }).populate("items.productId items.colorId items.sizeId");

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
      const { paymentMethod, address } = req.body;

      const userId = req.session.user;

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

      // if (!userCart) {
      //   return res.status(404).json({ error: "User's cart not found" });
      // }

      const status = paymentMethod == "COD" ? "Confirmed" : "Pending";
      const paymentStatus = paymentMethod == "COD" ? "Pending" : "Paid";

     
      





      // for (const item of userCart.items) {
      //   // Find the product by ID
      //   const product = await Product.findById(item.productId);
      //   const orders = await Order.find();

      //   for (let order of orders) {
      //     const updatedItems = await Promise.all(order.items.map(async (item) => {
      //       if (!item.productDetail || !item.productDetail.name) {
      //         item.productDetail = {
      //           name: product.name,
      //           color: product.variants.color,
      //           size: size.variants.size,
      //           price: product.actualPrice,
      //         };
      //       }
      //       return item;
      //     }));

      //     order.items = updatedItems;
      //     await order.save();
      //   }
      //   console.log('productdetails  added successfully.');
      // }
      
      // for (const item of userCart.items) {

      // const product = await Product.findById(item.productId);

      // const variant = product.variants.find(
      //   (variant) => variant.size.toString() === item.sizeId.toString() && variant.color.toString() === item.colorId.toString()
      // );
      //   const orders = await Order.find();


      //   for (let order of orders) {
      //     const updatedItems = await Promise.all(order.items.map(async (item) => {
      //       if (!item.productDetail || !item.productDetail.name) {
      //         item.productDetail = {
      //           name: product.name,
      //           color: product.variants.color,
      //           size: size.variants.size,
      //           price: product.actualPrice,
      //         };
      //       }
      //       return item;
      //     }));

      //     order.items = updatedItems;
      //   }

      let order = new Order({
        customerId: userId,
        items: userCart.items,
        totalPrice: userCart.totalPrice,
        payable: userCart.payable,
        paymentMethod,
        // productDetail:item,
        paymentStatus,
        status,
        shippingAddress,
      });

      console.log("these are the orders:", order);

      order.items.forEach((item) => {
        item.status = "Pending";
      });

      order.status = paymentMethod == "COD" ? "Confirmed" : "Pending";



      order.items.forEach((item) => {
        item.paymentStatus = order.paymentStatus;
      });
      
      // console.log("These are the orders:", order);

      //   order.items.forEach((item) => {
      //   item.status = "Pending";
      // });



      switch (paymentMethod) {
        case "COD":
          if (!order) {
            return res.status(500).json({ error: "Failed to create order" });
          }

          // Save the order
          // const orderPlaced = await order.save();
          // req.session.orderDetails = orderPlaced; // Store order details in session

          // if (orderPlaced) {
            // // reduce stock of the variant
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

              // Attach product details to the order item
              item.productDetail = {
                name: product.name,
                color: variant.color.name, // Assuming color is an object with a `name` property
                size: variant.size.value, // Assuming size is an object with a `value` property
                price: product.price,
              };


              await product.save();
            }

            // Save the updated product and order
            const orderPlaced = await order.save();
            req.session.orderDetails = orderPlaced;

            if (!orderPlaced) {
              return res.status(500).json({ error: "Failed to create order" });
            }

            // Proceed with the rest of the checkout process here

            const userId = req.session.user;

            await Cart.clearCart(userId);


            
            return res.status(200).json({
              success: true,
              message: "Order has been placed successfully.",
            });
          // }

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
