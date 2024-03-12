const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const { generateUniqueNumber } = require('@/middlewares/inventory');
const { loadSettings, increaseBySettingKey } = require('@/middlewares/settings');

const create = async (req, res) => {
  let body = req.body;
  // const settings = await loadSettings();

  // const last_order_number = settings['last_invoice_number'];
  // console.log('last_order_number', last_order_number);
  const latestInvoice = await Model.findOne({ type: body.type }).sort({ _id: -1 }).lean();
  // const latestInvoice = await Model.findOne({ _id: latestDocument._id });
  console.log('latestInvoice', latestInvoice.number);

  body.number = latestInvoice.number + 1;
   console.log('body.number', body.number);

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  const { items = [], taxRate = 0, discount = 0 } = value;

  // default
  let subTotal = 0;
  let taxTotal = 0;
  let total = 0;

  //Calculate the items array with subTotal, total, taxTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
  taxTotal = calculate.multiply(subTotal, taxRate / 100);
  total = calculate.add(subTotal, taxTotal);

  body['subTotal'] = subTotal;
  body['taxTotal'] = taxTotal;
  body['total'] = total;
  body['items'] = items;

  let paymentStatus = calculate.sub(total, discount) === 0 ? 'paid' : 'unpaid';

  body['paymentStatus'] = paymentStatus;
  body['createdBy'] = req.admin._id;
  // Creating a new document in the collection
  const result = await new Model(body).save();
  const fileId = 'invoice-' + result._id + '.pdf';
  const updateResult = await Model.findOneAndUpdate(
    { _id: result._id },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();
  // Returning successfull response

  increaseBySettingKey({ settingKey: 'last_invoice_number' });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Invoice created successfully',
  });
};

module.exports = create;
