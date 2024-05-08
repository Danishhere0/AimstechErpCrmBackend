const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Payment');

const summary = async (req, res) => {
  let defaultType = 'month';

  const { type } = req.query;

  if (type) {
    if (['week', 'month', 'year'].includes(type)) {
      defaultType = type;
    } else {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid type',
      });
    }
  }
  let admin;
  if (req.admin.role == 'admin' || req.admin.role == 'superadmin') {
    admin = req.admin._id;
  } else {
    admin = req.admin.admin._id;
  }
  const currentDate = moment();
  let startDate = currentDate.clone().startOf(defaultType);
  let endDate = currentDate.clone().endOf(defaultType);

  // get total amount of invoices
  const saleResult = await Model.aggregate([
    {
      $match: {
        admin,
        removed: false,
        type: 'sale',
        date: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate(),
        },
      },
    },
    {
      $group: {
        _id: null, // Group all documents into a single group
        count: {
          $sum: 1,
        },
        total: {
          $sum: '$amount',
        },
      },
    },
    {
      $project: {
        _id: 0, // Exclude _id from the result
        count: 1,
        total: 1,
      },
    },
  ]);
  const purchaseResult = await Model.aggregate([
    {
      $match: {
        admin,
        removed: false,
        type: 'purchase',
        date: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate(),
        },
      },
    },
    {
      $group: {
        _id: null, // Group all documents into a single group
        count: {
          $sum: 1,
        },
        total: {
          $sum: '$amount',
        },
      },
    },
    {
      $project: {
        _id: 0, // Exclude _id from the result
        count: 1,
        total: 1,
      },
    },
  ]);

  console.log(purchaseResult, saleResult, 'chck', startDate.toDate(), endDate.toDate());
  const sale = saleResult.length > 0 ? saleResult[0] : { count: 0, total: 0 };
  const purchase = purchaseResult.length > 0 ? purchaseResult[0] : { count: 0, total: 0 };
  return res.status(200).json({
    success: true,
    result: { sale, purchase },
    message: `Successfully fetched the summary of payment invoices for the last ${defaultType}`,
  });
};

module.exports = summary;
