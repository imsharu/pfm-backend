const sequelize = require('../config/db');
const User = require('./user');
const Wallet = require('./wallet');
const Transaction = require('./transaction');
const Budget = require('./budget');

User.hasMany(Wallet, { foreignKey: 'userId', onDelete: 'CASCADE' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(Transaction, { foreignKey: 'walletId', onDelete: 'CASCADE' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId' });

User.hasMany(Budget, { foreignKey: 'userId', onDelete: 'CASCADE' });
Budget.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Wallet, Transaction, Budget };
