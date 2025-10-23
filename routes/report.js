const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Transaction, Wallet } = require('../models');
const { Op } = require('sequelize');

function getMonthBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2,'0');
  const start = `${y}-${m}-01`;
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const end = next.toISOString().slice(0,10);
  return { start, end };
}

router.get('/', auth, async (req, res) => {
  try {
    const { start, end } = getMonthBounds(new Date());
    // The include on Wallet ensures only this user's wallets are counted
    const income = await Transaction.sum('amount', {
      where: { type: 'income', date: { [Op.gte]: start, [Op.lt]: end } },
      include: [{ model: Wallet, where: { userId: req.user.id }, attributes: [] }]
    });

    const expenses = await Transaction.sum('amount', {
      where: { type: 'expense', date: { [Op.gte]: start, [Op.lt]: end } },
      include: [{ model: Wallet, where: { userId: req.user.id }, attributes: [] }]
    });

    const incomeVal = parseFloat(income || 0);
    const expensesVal = parseFloat(expenses || 0);
    const savings = incomeVal - expensesVal;

    res.json({
      month: start.slice(0,7),
      totalIncome: incomeVal,
      totalExpenses: expensesVal,
      netSavings: savings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
