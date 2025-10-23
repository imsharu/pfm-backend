const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Budget, Transaction, Wallet } = require('../models');
const { Op, fn, col, where, literal } = require('sequelize');

function getMonthString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2,'0');
  return `${y}-${m}`;
}

router.post('/', auth, async (req, res) => {
  try {
    const { category, amount, month } = req.body;
    if(!category || !amount) return res.status(400).json({ message: 'Category and amount required' });
    const monthStr = month || getMonthString();

    const [budget, created] = await Budget.findOrCreate({
      where: { userId: req.user.id, category, month: monthStr },
      defaults: { amount, userId: req.user.id }
    });

    if(!created) {
      // update amount
      await budget.update({ amount });
    }

    res.json(budget);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const month = req.query.month || getMonthString();

    const budgets = await Budget.findAll({ where: { userId: req.user.id, month }});

    // For each budget compute spent amount for current month
    const budgetsWithSpent = await Promise.all(budgets.map(async b => {
      // sum expenses for user's wallets for that month and category
      const start = `${b.month}-01`;
      const end = new Date(b.month + '-01');
      end.setMonth(end.getMonth() + 1);
      const endStr = end.toISOString().slice(0,10);

      const spent = await Transaction.sum('amount', {
        where: {
          category: b.category,
          type: 'expense',
          date: { [Op.gte]: start, [Op.lt]: endStr }
        },
        include: [{ model: Wallet, where: { userId: req.user.id }, attributes: [] }]
      });

      const spentVal = parseFloat(spent || 0);
      const pct = (spentVal / parseFloat(b.amount)) * 100;
      return {
        id: b.id,
        category: b.category,
        amount: parseFloat(b.amount),
        month: b.month,
        spent: spentVal,
        usagePercent: Math.round(pct * 100) / 100,
        approaching: spentVal >= parseFloat(b.amount) * 0.9,
        exceeded: spentVal > parseFloat(b.amount)
      };
    }));

    res.json(budgetsWithSpent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
