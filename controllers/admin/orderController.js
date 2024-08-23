const Order = require("../../models/orderSchema");


module.exports= {
    getOrderList: async (req, res, next) => {

        // let perPage = 10;
        // let page = req.query.page || 1;
    
        let orderDetails = await Order.aggregate([
          {
            $project: {
              _id: 1,
              customerId: 1,
              items: 1,
              shippingAddress: 1,
              paymentMethod: 1,
              totalPrice: 1,
              
              payable: 1,
              categoryDiscount: 1,
              paymentStatus: 1,
              orderStatus: 1,
              createdAt: 1,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "customerId",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: { path: "$items" } },
          {
            $lookup: {
              from: "products",
              localField: "items.productId",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $lookup: {
              from: "colors",
              localField: "items.color",
              foreignField: "_id",
              as: "product-color",
            },
          },
          {
            $lookup: {
              from: "sizes",
              localField: "items.size",
              foreignField: "_id",
              as: "product-size",
            },
          },
          {
            $addFields: {
              productDetails: {
                $mergeObjects: [
                  {
                    $arrayElemAt: ["$product_detail", 0],
                  },
                  {
                    $arrayElemAt: ["$product-color", 0],
                  },
                  { $arrayElemAt: ["$product-size", 0] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              user: 1,
              items: 1,
              paymentMethod: 1,
              totalPrice: 1,
             
              payable: 1,
              paymentStatus: 1,
              orderStatus: 1,
              createdAt: 1,
              productDetails: 1,
            },
          },
          { $sort: { createdAt: -1 } },
        //   { $skip: perPage * page - perPage },
        //   { $limit: perPage },
        ]);
    
        // console.log(orderDetails, orderDetails.length);
    
        // console.log(orders);
        const count = await Order.countDocuments();
        // const nextPage = parseInt(page) + 1;
        // const hasNextPage = nextPage <= Math.ceil(count / perPage);
    
        res.render("admin/orderList", {
        //locals,
          orders: orderDetails,
        //   current: page,
        //   pages: Math.ceil(count / perPage),
        //   nextPage: hasNextPage ? nextPage : null,
        //   currentRoute: "/admin/orders/",
        //   layout,
        });
    }
}