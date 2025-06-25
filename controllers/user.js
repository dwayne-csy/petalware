const connection = require('../config/database');
const bcrypt = require('bcrypt');

const registerUser = async (req, res) => {
    // {
    //   "name": "steve",
    //   "email": "steve@gmail.com",
    //   "password": "password",
    //   "role": "user" (optional)
    // }
    const { name, password, email, role = 'user' } = req.body;
    
    // Validate role
    if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userSql = 'INSERT INTO users (name, password, email, role) VALUES (?, ?, ?, ?)';
    
    try {
        connection.execute(userSql, [name, hashedPassword, email, role], (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: 'Error registering user' });
            }

            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                userId: result.insertId
            });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const loginUser = async (req, res) => {
    // {
    //   "email": "steve@gmail.com",
    //   "password": "password"
    // }
    const { email, password } = req.body;
    const sql = 'SELECT id, name, email, password, role FROM users WHERE email = ?';
    
    connection.execute(sql, [email], async (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error logging in', details: err });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Remove password from response
        const { password: _, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: userData
        });
    });
};

const updateUser = (req, res) => {
    // {
    //   "name": "steve",
    //   "email": "steve@gmail.com",
    //   "address": "123 Main St"
    // }
    const { id, name, email, address } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const userSql = `
        UPDATE users 
        SET name = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`;
    
    try {
        connection.execute(userSql, [name, email, address, id], (err, result) => {
            if (err) {
                console.log(err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: 'Error updating user' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json({
                success: true,
                message: 'User updated successfully'
            });
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const deactivateUser = (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const sql = 'DELETE FROM users WHERE id = ?';

    connection.execute(sql, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error deactivating user', details: err });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            userId: id
        });
    });
};

module.exports = { registerUser, loginUser, updateUser, deactivateUser };