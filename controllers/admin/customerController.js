const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {

    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 3;

    //Fetch - user data
    const userData = await User.find({
      isAdmin: false,
      $or: [
        {name: {$regex: ".*" + search + ".*" }},
        {email: {$regex: ".*" + search + ".*" }},
      ],
    })
    .limit(limit)
    .skip((page-1)*limit)
    .exec();

    // Count - Documents
    const count = await User.find({
        isAdmin: false,
        $or: [
            {name: {$regex: ".*" + search + ".*"}},
            {email: {$regex: ".*" + search + ".*"}},
        ],
    }).countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Render the EJS template with data
    res.render("admin/customers", { data: userData, totalPages, currentPage: page });

  } catch (error) {
    console.error('Error fetching customer data:', error);
    res.redirect("/pageerror");
  }
};


const customerBlocked = async (req,res) =>{
  try {
    let id = req.query.id;
    await User.updateOne({_id: id}, {$set: { isBlocked:true}});
    res.redirect("/admin/users");
  } catch (error) {
    console.error('Error blocking customer:', error);
    res.redirect("/pageerror");
  }
}

const customerunBlocked = async (req,res) => {
  try {
    let id = req.query.id;
    await User.updateOne({_id:id}, {$set: {isBlocked:false}});
    res.redirect("/admin/users");
  } catch (error) {
    res.redirect("/pageerror");
  }
}



module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
};
