require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // Import Nodemailer

// Models
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const AuditLog = require('./models/AuditLog');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lenden_local';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: 'gmail', // Change if using Outlook/Yahoo
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (e) {
        res.status(401).json({ error: "Invalid Token" });
    }
};

// --- AUTH ROUTER ---
app.post('/api/register', async (req, res) => {
    // 1. Destructure email from body
    const { userId, email, password, name } = req.body;
    
    try {
        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Create User (Balance defaults to 500 in Schema)
        const newUser = await User.create({ 
            userId, 
            email, 
            password: hashedPassword, 
            name, 
            role: 'user' 
        });

        // 4. Send Confirmation Email (Async - don't block response)
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to SecurePay - ₹500 Bonus Received!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4F46E5;">Welcome to SecurePay, ${name}!</h2>
                    <p>Congratulations! Your account has been successfully created.</p>
                    <div style="background-color: #ECFDF5; padding: 15px; border-radius: 5px; color: #065F46; margin: 20px 0;">
                        <strong>🎉 Bonus Credited:</strong> ₹500.00
                    </div>
                    <p>You can now login with your User ID: <strong>${userId}</strong></p>
                    <p>Regards,<br/>The LendenClub Team</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("Email Error:", err);
            else console.log("Email Sent:", info.response);
        });

        res.json({ message: "Registration Successful! Confirmation email sent." });

    } catch (e) {
        // Handle Duplicate Email or UserID
        if (e.code === 11000) {
            const field = Object.keys(e.keyPattern)[0];
            return res.status(400).json({ error: `${field.toUpperCase()} already exists.` });
        }
        res.status(400).json({ error: "Invalid Data or Server Error" });
    }
});

app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid Password" });

        const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        res.json({ token, user: { userId: user.userId, name: user.name, role: user.role, balance: user.balance } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- CORE LOGIC (Transfer, Users, Logs) ---

// 1. Get Users (Updated to exclude admins for the management table)
// ... (imports and middleware remain the same)

// 1. Get Users - Refined to prevent frontend crashes
app.get('/api/users', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Admin sees all 'user' role accounts. 
            // We explicitly include password to prevent .substring() errors on frontend
            const users = await User.find({ role: 'user' }); 
            res.json(users);
        } else {
            // Normal users only see ID/Name for transfers
            const users = await User.find({ role: 'user' }, 'userId name'); 
            res.json(users);
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Transfer Endpoint - Standardized Logging
app.post('/api/transfer', authenticate, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const { receiverUserId, amount } = req.body;

    try {
        const val = parseFloat(amount);
        const sender = await User.findById(req.user.id).session(session);
        const receiver = await User.findOne({ userId: receiverUserId }).session(session);

        if (!receiver) throw new Error("Receiver not found");
        if (sender.balance < val) throw new Error("Insufficient funds");

        // Atomic Updates
        const updatedSender = await User.findByIdAndUpdate(sender._id, { $inc: { balance: -val } }, { session, new: true });
        const updatedReceiver = await User.findByIdAndUpdate(receiver._id, { $inc: { balance: val } }, { session, new: true });

        // Save Transaction with snapshots
        await Transaction.create([{
            senderId: sender._id,
            receiverId: receiver._id,
            senderUserId: sender.userId,
            receiverUserId: receiver.userId,
            amount: val,
            senderBalanceAfter: updatedSender.balance,
            receiverBalanceAfter: updatedReceiver.balance,
            status: 'COMPLETED'
        }], { session });

        // Keep your existing AuditLog code here (no changes needed to it)
        await AuditLog.create([{
            action: 'TRANSFER',
            details: `${sender.userId} sent ₹${val} to ${receiverUserId}`,
            status: 'SUCCESS',
            senderId: sender.userId,
            receiverId: receiverUserId
        }], { session });

        await session.commitTransaction();
        res.json({ success: true });
    } catch (e) {
        await session.abortTransaction();
        res.status(400).json({ error: e.message });
    } finally {
        session.endSession();
    }
});

// --- FIXED AUDIT LOG ENDPOINT ---
app.get('/api/audit-logs', authenticate, async (req, res) => {
    try {
        const { targetUserId } = req.query;
        let query = {};

        if (req.user.role === 'admin') {
            // ADMIN VIEW
            if (targetUserId) {
                // Search by the custom string 'userId' (e.g. "alice123")
                query = { 
                    $or: [
                        { senderId: targetUserId }, 
                        { receiverId: targetUserId }
                    ] 
                };
            } else {
                query = {}; // All logs
            }
        } else {
            // NORMAL USER VIEW
            query = { 
                $or: [
                    { senderId: req.user.userId }, 
                    { receiverId: req.user.userId }
                ] 
            };
        }

        const logs = await AuditLog.find(query).sort({ timestamp: -1 });
        
        // Debugging: Log what the query found
        console.log(`Query for ${req.user.userId}:`, JSON.stringify(query));
        console.log(`Results found:`, logs.length);

        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/ledger', authenticate, async (req, res) => {
    try {
        const { targetUserId } = req.query;
        let query = {};

        if (req.user.role === 'admin' && targetUserId) {
            query = { $or: [{ senderUserId: targetUserId }, { receiverUserId: targetUserId }] };
        } else if (req.user.role === 'admin') {
            query = {}; // All transactions
        } else {
            // Normal User: query using their string userId
            query = { $or: [{ senderUserId: req.user.userId }, { receiverUserId: req.user.userId }] };
        }

        const txs = await Transaction.find(query).sort({ timestamp: -1 }).lean();
        res.json(txs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/me', authenticate, async (req, res) => res.json(await User.findById(req.user.id)));

// --- NUKE ROUTE (OPTIONAL: Keep if you need to wipe DB again) ---
app.get('/api/nuke-db', async (req, res) => {
    await User.collection.drop();
    await AuditLog.collection.drop();
    await Transaction.collection.drop();
    res.send("DB Wiped");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));