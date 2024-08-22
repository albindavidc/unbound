const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");


const handleCartUpdate = async (req, res, increment = true) => {
  try {
    const userID = req.user.id;
    const { id: productId, variant: variantId } = req.params;
    const cart = await Cart.findOne({ userId: userID });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    const item = cart.items[itemIndex];
    const product = await Product.findById(productId).populate("variants");
    const variant = product.variants.find(
      (v) => v._id.toString() === variantId
    );
    const stock = variant.stock;

    if (increment && item.quantity >= stock) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity exceeds product stock" });
    } else if (!increment && item.quantity <= 1) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot decrease quantity below 1" });
    }

    const updated = await Cart.updateOne(
      {
        userId: req.user.id,
        "items.productId": productId,
        "items.variantId": variantId,
      },
      {
        $inc: {
          "items.$.quantity": increment ? 1 : -1,
        },
      },
      { new: true }
    );

    if (updated) {
      let userCart = await Cart.findOne({ userId: req.session.user }).populate(
        "items.productId"
      );
      // let totalPrice = 0;
      // for (let prod of userCart.items) {
      //   prod.price = prod.product_id.onOffer
      //     ? Math.ceil(prod.product_id.sellingPrice - Math.ceil(prod.product_id.sellingPrice * prod.product_id.offerDiscountRate) / 100)
      //     : prod.product_id.sellingPrice;
      //   prod.itemTotal = prod.price * prod.quantity;
      //   console.log(prod.price, prod.itemTotal);
      //   totalPrice += prod.itemTotal;
      // }

      let totalPrice = 0;
      let totalPriceBeforeOffer = 0;
      for (const prod of userCart.items) {
        prod.price = prod.productId.onOffer
          ? prod.productId.offerDiscountPrice
          : prod.productId.sellingPrice;

        const itemTotal = prod.price * prod.quantity;
        prod.itemTotal = itemTotal;
        totalPrice += itemTotal;
        totalPriceBeforeOffer += prod.price;
      }

      userCart.totalPrice = totalPrice;
      await userCart.save();
      console.log(userCart);
      const currentItem = userCart.items.find(
        (item) =>
          item.productId._id.toString() === productId &&
          item.variantId.toString() === variantId
      );

      console.log(totalPrice);

      return res
        .status(200)
        .json({ success: true, cart: currentItem, totalPrice });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to update cart item",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
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
      }else {

        let totalPriceBeforeOffer = 0;
        for (const prod of cart.items) {
          prod.price = prod.productId.onOffer
            ? prod.productId.offerDiscountPrice
            : prod.productId.sellingPrice;
  
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
            console.log(
              `The Variant of Product ${product.name} is not found!!`
            );
            errors.push(
              `The Variant of Product ${product.name} is not found!!`
            );
            continue;
          }

          const variant = products.variants.find(
            (v) => v?._id?.toString() === item.variantId?.toString()
          );
  
          const stock = variant?.stock;
          if (item.quantity > stock) {
            item.outOfStock = true;
            console.log(
              `The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`
            );
            errors.push(
              `The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`
            );
          }
        }
        await cart.save();
        // Assuming totalPrice is needed for the response
      }
  
      
  
      // for (let i = 0; i < cart.items.length; i++) {
      //   const item = cart.items[i];
      //   // const product = await Product.findOne({ _id: item.productId }).populate("variants.color variants.size");
  

      //   const product = await Product.findById(item.productId);
      //   const variant = product.variants.id(item.variantId);

      //   if (!product) {
      //     console.log(`The Product ${item.productId} is not found!!`);
      //     errors.push(`The Product ${item.productId} is not found!!`);
      //     continue;
      //   }
  
      //   if (!product.isActive) {
      //     console.log(`The Product ${product.name} is not available!!`);
      //     errors.push(`The Product ${product.name} is not available!!`);
      //     continue;
      //   }
        
  
      //   // Safely find the variant
      //   // const variant = product.variants.find((v) => v?._id?.toString() === item.variantId?.toString());


      //   if (!variant) {
      //     console.log(`The Variant of Product ${product.name} is not found!!`);
      //     errors.push(`The Variant of Product ${product.name} is not found!!`);
      //     continue;
      //   }
  
      //   // Calculate item price and total price
      //   item.price = product.onOffer ? product.offerDiscountPrice : product.sellingPrice;
      //   // const itemTotal = item.sellingPrice * item.quantity;
      //   // item.itemTotal = itemTotal;
      //   // totalPrice += itemTotal;
      //   // totalPrice = item.price;

      //   item.itemTotal = item.price* item.quantity;
      //   totalPrice += item.itemTotal;
        
        
  

      
      //   // Check stock
      //   if (item.quantity > variant.stock) {
      //     item.outOfStock = true;
      //     console.log(`The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
      //     errors.push(`The Product ${product.name}, Color: ${variant.color.name}, Size: ${variant.size.value} is out of stock!!`);
      //   }
  
      //   // Update the cart item in the database
      //   cart.items[i] = item;
      // }


      
      // cart.totalPrice = totalPrice;
      // cart.payable = totalPrice;
      
      // console.log("this is the totalPrice: ",totalPrice)

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

      const product = await Product.findById(productId).populate('variants.color').populate('variants.size');

      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const selectedVariant = product.variants.find(variant => 
          variant.color._id.toString() === colorId && variant.size._id.toString() === sizeId
      );

      if (!selectedVariant) {
          return res.status(404).json({ success: false, message: 'Variant not found' });
      }

      const variantId = selectedVariant._id;

      console.log("these is the variantid ", variantId);
      console.log("this is the product", product);
  
      cart.items.push({ productId, colorId,sizeId,variantId, quantity,price }); 
      await cart.save();
  

      res.json({ message: 'Product added to cart', count: cart.items.length });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding product to cart' });

    }
  },

  removeCartItem: async (req, res) => {
    try {
      const userId = req.session.user;
      const productId = req.body.productId;

      const cart = await Cart.findOne({userId}).populate('items.productId');

     
      const itemIndex = cart.items.findIndex((item) =>{
        item.productId.toString() === productId
      });

      cart.items.splice(itemIndex,1);
      await cart.save();

      res.status(200).json({message: "Item removed from the cart successfully"});
    }catch(error){
      res.status(500).json({error: "An error occured while deleting the product"});
    }
    //   const sizeId = req.body.sizeId;
  
    //   const cart = await Cart.findOne({ userId }).populate('items.productId items.variantId items.colorId items.sizeId');
  
    //   if (!cart) {
    //     return res.status(404).json({ error: 'Cart not found' });
    //   }
  
    //   // Find the item to remove
    //   const itemIndex = cart.items.findIndex(
    //     (item) => item.productId.toString() === productId && item.sizeId.toString() === sizeId
    //   );
  
    //   if (itemIndex === -1) {
    //     return res.status(404).json({ error: 'Item not found in cart' });
    //   }
  
    //   // Remove the item from the cart
    //   cart.items.splice(itemIndex, 1);
  
    //   // Update the cart in the database
    //   await cart.save();
  
    //   res.status(200).json({ message: 'Item removed from cart successfully' });
    // } catch (error) {
    //   console.error(error);
    //   res.status(500).json({ error: 'An error occurred while removing the item from cart' });
    },

  // Use the helper function in both incrementCartItem and decrementCartItem
  incrementCartItem: async (req, res) => {
    await handleCartUpdate(req, res, true);
  },

  decrementCartItem: async (req, res) => {
    await handleCartUpdate(req, res, false);
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
