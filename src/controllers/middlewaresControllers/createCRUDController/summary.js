const summary = async (Model, req, res) => {
  //  Query the database for a list of all results
  let admin;
  if (req.admin.role == 'admin' || req.admin.role == 'superadmin') {
    admin = req.admin._id;
  } else {
    admin = req.admin.admin._id;
  }
  const countPromise = Model.countDocuments({ admin, removed: false });

  const resultsPromise = await Model.countDocuments({ admin, removed: false })
    .where(req.query.filter)
    .equals(req.query.equal)
    .exec();
  // Resolving both promises
  const [countFilter, countAllDocs] = await Promise.all([resultsPromise, countPromise]);

  if (countAllDocs.length > 0) {
    return res.status(200).json({
      success: true,
      result: { countFilter, countAllDocs },
      message: 'Successfully count all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = summary;
