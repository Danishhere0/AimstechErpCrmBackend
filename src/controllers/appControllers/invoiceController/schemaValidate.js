const Joi = require('joi');
const schema = Joi.object({
  client: Joi.alternatives().try(Joi.string(), Joi.object()),
  supplier: Joi.alternatives().try(Joi.string(), Joi.object()),
  number: Joi.number().required(),
  year: Joi.number().required(),
  status: Joi.string().required(),
  note: Joi.string().allow(''),
  expiredDate: Joi.date().required(),
  date: Joi.date().required(),
  type: Joi.string().required(''),
  // array cannot be empty
  items: Joi.array()
    .items(
      Joi.object({
        _id: Joi.string().allow('').optional(),
        itemName: Joi.string().required(),
        description: Joi.string().allow(''),
        quantity: Joi.number().required(),
        price: Joi.number().required(),
        total: Joi.number().required(),
        discount: Joi.number().allow(),
      }).required()
    )
    .required(),
  taxRate: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
});

module.exports = schema;
