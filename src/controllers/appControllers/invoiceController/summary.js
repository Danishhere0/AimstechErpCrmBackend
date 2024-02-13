const mongoose = require('mongoose');
const moment = require('moment');

const Model = mongoose.model('Invoice');

const summary = async (req, res) => {
  let defaultType = 'month';
  
  const { type, id } = req.query;
console.log('iddd', id);
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

  const currentDate = moment();
  let startDate = currentDate.clone().startOf(defaultType);
  let endDate = currentDate.clone().endOf(defaultType);

  const statuses = ['draft', 'pending', 'overdue', 'paid', 'unpaid', 'partially'];

  const response = await Model.aggregate([
    {
      $match: {
        removed: false,
        type: 'purchase',
        supplier:id,
        // date: {
        //   $gte: startDate.toDate(),
        //   $lte: endDate.toDate(),
        // },
      },
    },
    {
      $facet: {
        totalInvoice: [
          {
            $group: {
              _id: null,
              total: {
                $sum: '$total',
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              total: '$total',
              count: '$count',
            },
          },
        ],
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        paymentStatusCounts: [
          {
            $group: {
              _id: '$paymentStatus',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        overdueCounts: [
          {
            $match: {
              expiredDate: {
                $lt: new Date(),
              },
            },
          },
          {
            $group: {
              _id: '$status',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
      },
    },
  ]);

  let result = [];

  const totalInvoices = response[0].totalInvoice ? response[0].totalInvoice[0] : 0;
  const statusResult = response[0].statusCounts || [];
  const paymentStatusResult = response[0].paymentStatusCounts || [];
  const overdueResult = response[0].overdueCounts || [];

  const statusResultMap = statusResult.map((item) => {
    return {
      ...item,
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    };
  });

  const paymentStatusResultMap = paymentStatusResult.map((item) => {
    return {
      ...item,
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    };
  });

  const overdueResultMap = overdueResult.map((item) => {
    return {
      ...item,
      status: 'overdue',
      percentage: Math.round((item.count / totalInvoices.count) * 100),
    };
  });

  statuses.forEach((status) => {
    const found = [...paymentStatusResultMap, ...statusResultMap, ...overdueResultMap].find(
      (item) => item.status === status
    );
    if (found) {
      result.push(found);
    }
  });

  const unpaid = await Model.aggregate([
    {
      $match: {
        removed: false,
        type: 'purchase',
        // date: {
        //   $gte: startDate.toDate(),
        //   $lte: endDate.toDate(),
        // },
        paymentStatus: {
          $in: ['unpaid', 'partially'],
        },
      },
    },
    {
      $group: {
        _id: null,
        total_amount: {
          $sum: {
            $subtract: ['$total', '$credit'],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total_amount: '$total_amount',
      },
    },
  ]);

  const finalResult = {
    total: totalInvoices?.total,
    total_undue: unpaid.length > 0 ? unpaid[0].total_amount : 0,
    type,
    performance: result,
  };

  const saleResponse = await Model.aggregate([
    {
      $match: {
        removed: false,
        type: 'sale',
        // date: {
        //   $gte: startDate.toDate(),
        //   $lte: endDate.toDate(),
        // },
      },
    },
    {
      $facet: {
        totalInvoice: [
          {
            $group: {
              _id: null,
              total: {
                $sum: '$total',
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              total: '$total',
              count: '$count',
            },
          },
        ],
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        paymentStatusCounts: [
          {
            $group: {
              _id: '$paymentStatus',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
        overdueCounts: [
          {
            $match: {
              expiredDate: {
                $lt: new Date(),
              },
            },
          },
          {
            $group: {
              _id: '$status',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: '$count',
            },
          },
        ],
      },
    },
  ]);

  let saleResult = [];

  const saleTotalInvoices = saleResponse[0].totalInvoice ? saleResponse[0].totalInvoice[0] : 0;
  const saleStatusResult = saleResponse[0].statusCounts || [];
  const salePaymentStatusResult = saleResponse[0].paymentStatusCounts || [];
  const saleOverdueResult = saleResponse[0].overdueCounts || [];

  const saleStatusResultMap = saleStatusResult.map((item) => {
    return {
      ...item,
      percentage: Math.round((item.count / saleTotalInvoices.count) * 100),
    };
  });

  const salePaymentStatusResultMap = salePaymentStatusResult.map((item) => {
    return {
      ...item,
      percentage: Math.round((item.count / saleTotalInvoices.count) * 100),
    };
  });

  const saleOverdueResultMap = saleOverdueResult.map((item) => {
    return {
      ...item,
      status: 'overdue',
      percentage: Math.round((item.count / saleTotalInvoices.count) * 100),
    };
  });

  statuses.forEach((status) => {
    const found = [
      ...salePaymentStatusResultMap,
      ...saleStatusResultMap,
      ...saleOverdueResultMap,
    ].find((item) => item.status === status);
    if (found) {
      saleResult.push(found);
    }
  });

  const saleUnpaid = await Model.aggregate([
    {
      $match: {
        removed: false,
        type: 'sale',
        // date: {
        //   $gte: startDate.toDate(),
        //   $lte: endDate.toDate(),
        // },
        paymentStatus: {
          $in: ['unpaid', 'partially'],
        },
      },
    },
    {
      $group: {
        _id: null,
        total_amount: {
          $sum: {
            $subtract: ['$total', '$credit'],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        total_amount: '$total_amount',
      },
    },
  ]);

  const saleFinalResult = {
    total: saleTotalInvoices?.total,
    total_undue: saleUnpaid.length > 0 ? saleUnpaid[0].total_amount : 0,
    type,
    performance: saleResult,
  };
  return res.status(200).json({
    success: true,
    result: { finalResult, saleFinalResult },
    message: `Successfully found all invoices for the last ${defaultType}`,
  });
};

module.exports = summary;
