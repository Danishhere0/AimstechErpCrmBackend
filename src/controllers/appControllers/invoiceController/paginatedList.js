const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const type = req.query.type;

  const skip = page * limit - limit;
  let admin;
  if (req.admin.role == 'admin' || req.admin.role == 'superadmin') {
    admin = req.admin._id;
  } else {
    admin = req.admin.admin._id;
  }
  //  Query the database for a list of all results
  const resultsPromise = Model.find({ removed: false, type, admin })
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' })
    .populate('createdBy', 'name')
    .exec();
  // Counting the total documents
  const countPromise = Model.countDocuments({ removed: false, type });
  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);
  // Calculating total pages
  const pages = Math.ceil(count / limit);

  // Getting Pagination Object
  const pagination = { page, pages, count };
  if (count > 0) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
      message: 'Successfully found all documents',
    });
  } else {
    return res.status(203).json({
      success: true,
      result: [],
      pagination,
      message: 'Collection is Empty',
    });
  }
};

module.exports = paginatedList;
