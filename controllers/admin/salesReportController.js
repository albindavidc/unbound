const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

module.exports = {
  getSalesReport: async (req, res) => {
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();

    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    startDate.setUTCHours(0, 0, 0, 0);
    // endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate);

    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Failed"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "coupon",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: { path: "$coupon", preserveNullAndEmptyArrays: true } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "items.productDetails",
        },
      },
      {
        $lookup: {
          from: "colors",
          localField: "items.color",
          foreignField: "_id",
          as: "items.color",
        },
      },
      { $unwind: { path: "$items.color", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "sizes",
          localField: "items.size",
          foreignField: "_id",
          as: "items.size",
        },
      },
      { $unwind: { path: "$items.size", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          userID: { $first: "$customer" },
          shippingAddress: { $first: "$shippingAddress" },
          paymentMethod: { $first: "$paymentMethod" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalPrice" },
          coupon: { $first: "$coupon" },
          couponDiscount: { $first: "$couponDiscount" },
          payable: { $first: "$payable" },
          categoryDiscount: { $first: "$categoryDiscount" },
          createdAt: { $first: "$createdAt" },
          orderedItems: {
            $push: {
              productDetails: {
                product_name: { $arrayElemAt: ["$items.productDetails.name", 0] },
                price: "$items.price",
              },
              quantity: "$items.quantity",
              color: "$items.color.name",
              size: "$items.size.value",
              itemTotal: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
      },
    ]);

    console.log(orders);
    // console.log(orders[0].orderedItems);
    startDate = startDate.getFullYear() + "-" + ("0" + (startDate.getMonth() + 1)).slice(-2) + "-" + ("0" + startDate.getUTCDate()).slice(-2);

    endDate = endDate.getFullYear() + "-" + ("0" + (endDate.getMonth() + 1)).slice(-2) + "-" + ("0" + endDate.getUTCDate()).slice(-2);

    res.render("admin/salesReport", {
      startDate,
      endDate,
      orders,
    });
  },

  getSalesReportPdf: async (req, res) => {
    try {
      let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
      let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);

      console.log(startDate, endDate);

      const orders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["Cancelled", "Failed"] },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $lookup: {
            from: "coupons",
            localField: "coupon",
            foreignField: "_id",
            as: "coupon",
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "items.productDetails",
          },
        },
        // lookup color from colors and add to item
        {
          $lookup: {
            from: "colors",
            localField: "items.color",
            foreignField: "_id",
            as: "items.color",
          },
        },
        // lookup size from sizes and add to item
        {
          $lookup: {
            from: "sizes",
            localField: "items.size",
            foreignField: "_id",
            as: "items.size",
          },
        },
        // change size and color to object
        { $unwind: "$items.color" },
        { $unwind: "$items.size" },
        {
          $group: {
            _id: "$_id",
            userID: { $first: "$customer" },
            shippingAddress: { $first: "$shippingAddress" },
            paymentMethod: { $first: "$paymentMethod" },
            status: { $first: "$status" },
            totalAmount: { $first: "$totalPrice" },
            coupon: { $first: "$coupon" },
            couponDiscount: { $first: "$couponDiscount" },
            payable: { $first: "$payable" },
            categoryDiscount: { $first: "$categoryDiscount" },
            createdAt: { $first: "$createdAt" },
            orderedItems: { $push: "$items" },
          },
        },
      ]);

      // Ordered Item details
      orders.forEach((order) => {
        order.orderedItems = order.orderedItems.map((item) => ({
          productDetails: {
            product_name: item.productDetails[0].product_name,
            price: item.price,
          },
          quantity: item.quantity,
          color: item.color.name,
          size: item.size.value,
          itemTotal: item.price * item.quantity,
        }));
      });

      startDate = startDate.getFullYear() + "-" + ("0" + (startDate.getMonth() + 1)).slice(-2) + "-" + ("0" + startDate.getUTCDate()).slice(-2);

      endDate = endDate.getFullYear() + "-" + ("0" + (endDate.getMonth() + 1)).slice(-2) + "-" + ("0" + endDate.getUTCDate()).slice(-2);

      // endDate = endDate + " 23:59:59";

      res.render("admin/reports/pdf", {
        startDate,
        endDate,
        orders,
      });
    } catch (error) {
      console.log(error);
    }
  },

  salesReportExcel: async (req, res) => {
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate);
    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Failed"] },
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "shippingAddress",
          foreignField: "_id",
          as: "shippingAddress",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "coupon",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "items.productDetails",
        },
      },
      {
        $lookup: {
          from: "colors",
          localField: "items.color",
          foreignField: "_id",
          as: "items.color",
        },
      },
      {
        $lookup: {
          from: "sizes",
          localField: "items.size",
          foreignField: "_id",
          as: "items.size",
        },
      },
      { $unwind: "$items.color" },
      { $unwind: "$items.size" },
      {
        $group: {
          _id: "$_id",
          userID: { $first: "$customer" },
          shippingAddress: { $first: "$shippingAddress" },
          paymentMethod: { $first: "$paymentMethod" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalPrice" },
          coupon: { $first: "$coupon" },
          couponDiscount: { $first: "$couponDiscount" },
          payable: { $first: "$payable" },
          categoryDiscount: { $first: "$categoryDiscount" },
          createdAt: { $first: "$createdAt" },
          orderedItems: {
            $push: {
              productDetails: {
                product_name: "$items.productDetails.product_name",
                price: "$items.price",
              },
              quantity: "$items.quantity",
              color: "$items.color.name",
              size: "$items.size.value",
              itemTotal: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
      },
    ]);

    const workBook = new excelJS.Workbook();
    const worksheet = workBook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "_id" },
      { header: "Customer ID", key: "userID.userId" },
      { header: "Payment Method", key: "paymentMethod" },
      { header: "Payment Status", key: "status" },
      { header: "Shipping Address", key: "shippingAddress.0.address" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Coupon Applied", key: "coupon.0.code" },
      { header: "Discount Amount", key: "couponDiscount" },
      { header: "Final Price", key: "payable" },
      { header: "Category Discount", key: "categoryDiscount" },
      { header: "Order Date", key: "createdAt" },
      {
        header: "Ordered Items",
        key: "orderedItems",
        style: {
          font: { bold: true },
        },
      },
    ];

    orders.forEach((order) => {
      worksheet.addRow(order);
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    res.setHeader("content-Type", "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet");
    res.setHeader("content-Disposition", "attachment; filename=sales-report_.xlsx");

    return workBook.xlsx.write(res).then(() => {
      res.status(200);
    });
  },
};
