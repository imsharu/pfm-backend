const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Wallet, Transaction } = require('../models');

router.post('/', auth, async (req, res) => {
  try {
    const { name, initialBalance } = req.body;
    if (!name) return res.status(400).json({ message: 'Wallet name required' });
    const wallet = await Wallet.create({ name, userId: req.user.id, balance: initialBalance || 0 });
    res.status(201).json(wallet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const wallets = await Wallet.findAll({ where: { userId: req.user.id }});
    res.json(wallets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:walletId', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ where: { id: req.params.walletId, userId: req.user.id }});
    if(!wallet) return res.status(404).json({ message: 'Wallet not found' });

    // optional: check if wallet has transactions and handle accordingly
    await wallet.destroy();
    res.json({ message: 'Wallet deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
