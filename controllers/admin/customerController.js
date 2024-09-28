const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let perPage = 10;
    let page = parseInt(req.query.page) || 1;

    //Fetch - user data
    const userData = await User.find({
      isAdmin: false,
      $or: [{ name: { $regex: ".*" + search + ".*" } }, { email: { $regex: ".*" + search + ".*" } }],
    })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .exec();

    const count = await User.find({
      isAdmin: false,
      $or: [{ name: { $regex: ".*" + search + ".*" } }, { email: { $regex: ".*" + search + ".*" } }],
    }).countDocuments();


    const nextPage = parseInt(page) + 1;
    const totalPages = Math.ceil(count / perPage)
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;
    
    res.render("admin/customers", {
      data: userData,
      orders: userData,
      currentPage: page,
      perPage: perPage,
      nextPage,
      hasPrevPage,
      hasNextPage,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching customer data:", error);
    res.redirect("/pageerror");
  }
};

const customerBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Error blocking customer:", error);
    res.redirect("/pageerror");
  }
};

const customerunBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/users");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
};
