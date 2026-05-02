import express from 'express';
import { pool } from '../src/config/banco.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const SECRET = 'abacaxilaranja';

router.post('/login', async (req, res) => {
  const { cpf, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE cpf = $1',
      [cpf]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const valid = await bcrypt.compare(senha, user.senha_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      SECRET,
      { expiresIn: '8h' }
    );

    return res.json({ token });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;