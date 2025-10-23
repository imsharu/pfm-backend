const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Budget = sequelize.define('Budget', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(15,2), allowNull: false },
  month: { type: DataTypes.STRING(7), allowNull: false } // e.g. "2025-10"
}, {
  indexes: [
    { unique: true, fields: ['userId','category','month'] }
  ]
});

module.exports = Budget;
