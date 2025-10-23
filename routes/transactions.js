const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Transaction, Wallet, Budget } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { walletId, type, amount, category, date, description } = req.body;
    if(!walletId || !type || !amount || !category || !date) {
      await t.rollback(); return res.status(400).json({ message: 'Missing fields' });
    }

    const wallet = await Wallet.findOne({ where: { id: walletId, userId: req.user.id }, transaction: t });
    if(!wallet) { await t.rollback(); return res.status(404).json({ message: 'Wallet not found' }); }

    const tx = await Transaction.create({
      walletId, type, amount, category, date, description
    }, { transaction: t });

    // update wallet balance
    let newBalance = parseFloat(wallet.balance);
    if(type === 'income') newBalance += parseFloat(amount);
    else newBalance -= parseFloat(amount);

    await wallet.update({ balance: newBalance }, { transaction: t });

    await t.commit();
    res.status(201).json(tx);
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// edit transaction (PUT) - adjust wallet balance accordingly
router.put('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { walletId, type, amount, category, date, description } = req.body;

    const tx = await Transaction.findByPk(id);
    if (!tx) { await t.rollback(); return res.status(404).json({ message: 'Transaction not found' }); }

    const wallet = await Wallet.findOne({ where: { id: tx.walletId }, transaction: t });
    if(!wallet) { await t.rollback(); return res.status(404).json({ message: 'Wallet not found' }); }

    // Apply reverse of old tx
    let balance = parseFloat(wallet.balance);
    if(tx.type === 'income') balance -= parseFloat(tx.amount);
    else balance += parseFloat(tx.amount);

    // If wallet changed, adjust original wallet and new wallet separately
    if (walletId && walletId !== tx.walletId) {
      // adjust original wallet
      await wallet.update({ balance }, { transaction: t });
      const newWallet = await Wallet.findOne({ where: { id: walletId, userId: req.user.id }, transaction: t });
      if (!newWallet) { await t.rollback(); return res.status(404).json({ message: 'New wallet not found' }); }
      // apply new tx to new wallet
      let newBalance = parseFloat(newWallet.balance);
      if(type === 'income') newBalance += parseFloat(amount);
      else newBalance -= parseFloat(amount);
      await newWallet.update({ balance: newBalance }, { transaction: t });
    } else {
      // same wallet: apply new tx
      if(type === 'income') balance += parseFloat(amount);
      else balance -= parseFloat(amount);
      await wallet.update({ balance }, { transaction: t });
    }

    await tx.update({ walletId: walletId || tx.walletId, type, amount, category, date, description }, { transaction: t });
    await t.commit();
    res.json(tx);
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { walletId, startDate, endDate, category } = req.query;
    const where = {};

    if(walletId) where.walletId = walletId;
    if(category) where.category = category;
    if(startDate || endDate) {
      where.date = {};
      if(startDate) where.date[Op.gte] = startDate;
      if(endDate) where.date[Op.lte] = endDate;
    }

    // ensure user only sees transactions for wallets they own
    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Wallet, where: { userId: req.user.id }, attributes: ['id','name'] }]
    });

    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tx = await Transaction.findByPk(req.params.id);
    if(!tx) { await t.rollback(); return res.status(404).json({ message: 'Transaction not found' }); }

    const wallet = await Wallet.findOne({ where: { id: tx.walletId }, transaction: t });
    if(!wallet) { await t.rollback(); return res.status(404).json({ message: 'Wallet not found' }); }

    let balance = parseFloat(wallet.balance);
    // reverse transaction
    if(tx.type === 'income') balance -= parseFloat(tx.amount);
    else balance += parseFloat(tx.amount);
    await wallet.update({ balance }, { transaction: t });

    await tx.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
