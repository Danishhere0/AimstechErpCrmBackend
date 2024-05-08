const { migrate } = require('./migrate');

const paginatedList = async (Model, req, res) => {
  const page = req.query.page || 1;

  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;
  let admin;
  if (req.admin.role == 'admin' || req.admin.role == 'superadmin') {
    admin = req.admin._id;
  } else {
    admin = req.admin.admin._id;
  }
  //  Query the database for a list of all results
  const resultsPromise = Model.find({ admin, removed: false })
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' })
    .populate()
    .exec();

  // Counting the total documents
  const countPromise = Model.countDocuments({ removed: false });
  // Resolving both promises
  const [result, count] = await Promise.all([resultsPromise, countPromise]);
  // console.log('🚀 ~ file: paginatedList.js:23 ~ paginatedList ~ result:', result);

  // Calculating total pages
  const pages = Math.ceil(count / limit);

  const pagination = { page, pages, count };
  if (count > 0) {
    const migratedData = result.map((x) => migrate(x));
    // console.log('🚀 ~ file: paginatedList.js:23 ~ paginatedList ~ migratedData:', migratedData);
    return res.status(200).json({
      success: true,
      result: migratedData,
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
