const connection = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const saltRounds = 10;

const registerUser = async (req, res) => {
    const { name, password, email, contact_number, address } = req.body;
    
    try {
        // Normalize email by trimming and converting to lowercase
        const normalizedEmail = email.trim().toLowerCase();
        console.log('Registering email:', normalizedEmail);
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('Hashed password:', hashedPassword);

        const userSql = `INSERT INTO users 
                        (name, password, email, contact_number, address) 
                        VALUES (?, ?, ?, ?, ?)`;
        
        connection.execute(userSql, 
            [name, hashedPassword, normalizedEmail, contact_number || null, address || null], 
            (err, result) => {
                if (err) {
                    console.error('Registration error:', err);
                    return res.status(400).json({
                        success: false,
                        message: 'Registration failed',
                        error: err.code === 'ER_DUP_ENTRY' ? 'Email already exists' : 'Database error'
                    });
                }

                console.log('Registration successful for user ID:', result.insertId);
                return res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    userId: result.insertId
                });
            });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email and password are required' 
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log('Login attempt for:', normalizedEmail);

    // First check if the user exists at all
    const checkUserSql = `SELECT id, status FROM users WHERE email = ?`;
    
    connection.execute(checkUserSql, [normalizedEmail], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Database error' 
            });
        }

        if (results.length === 0) {
            console.log('No user found for:', normalizedEmail);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        const userStatus = results[0].status;
        if (userStatus !== 'active') {
            console.log('Inactive account attempt for:', normalizedEmail);
            return res.status(401).json({ 
                success: false, 
                message: 'Account is inactive' 
            });
        }

        // Now proceed with password verification for active users
        const sql = `
            SELECT * FROM users 
            WHERE email = ? 
            AND status = 'active'`;
        
        connection.execute(sql, [normalizedEmail], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }

            const user = results[0];
            console.log('Found active user:', user.email);
            
            try {
                const match = await bcrypt.compare(password, user.password);
                
                if (!match) {
                    console.log('Password mismatch for:', normalizedEmail);
                    return res.status(401).json({ 
                        success: false, 
                        message: 'Invalid credentials' 
                    });
                }

                const token = jwt.sign(
                    { id: user.id, role: user.role }, 
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );

                const { password: _, ...userData } = user;

                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    user: userData,
                    token,
                    redirectTo: '/profile.html'
                });
            } catch (error) {
                console.error('Password compare error:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Authentication error' 
                });
            }
        });
    });
};


const updateUser = (req, res) => {
    const { name, email, contact_number, address, userId } = req.body;
    let profile_image = null;

    if (req.file) {
        profile_image = req.file.path.replace(/\\/g, "/");
    }

    const userSql = `
        UPDATE users SET
            name = ?,
            email = ?,
            contact_number = ?,
            address = ?,
            profile_image = COALESCE(?, profile_image),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    const params = [
        name, 
        email, 
        contact_number || null, 
        address || null, 
        profile_image, 
        userId
    ];

    connection.execute(userSql, params, (err, result) => {
        if (err) {
            console.error('Update error:', err);
            return res.status(400).json({
                success: false,
                message: 'Update failed',
                error: err.code === 'ER_DUP_ENTRY' ? 'Email already exists' : err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    });
};

const deactivateUser = (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false,
            message: 'User ID is required' 
        });
    }

    const sql = `
        UPDATE users 
        SET 
            status = 'inactive',
            deleted_at = CURRENT_TIMESTAMP 
        WHERE id = ?`;

    connection.execute(sql, [userId], (err, result) => {
        if (err) {
            console.error('Deactivation error:', err);
            return res.status(500).json({ 
                success: false,
                message: 'Database error' 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'User deactivated successfully',
            userId
        });
    });
};

module.exports = { registerUser, loginUser, updateUser, deactivateUser };