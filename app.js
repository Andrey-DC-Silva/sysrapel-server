import express from 'express';
import cors from 'cors';

import Rotas_aut from './routes/rotas_aut.js';
import Rotas_usuarios from './routes/rotas_usuarios.js';
import Rotas_pesquisadores from './routes/rotas_pesquisadores.js';
import Rotas_proj from './routes/rotas_proj.js';
import Rotas_exp from './routes/rotas_exp.js';
import Rotas_exp_proj from './routes/rotas_exp_proj.js';
import Rotas_pessoas from './routes/rotas_pessoas.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'backend rodando',
    status: 'ok'
  });
});

app.use('/auth', Rotas_aut);
app.use('/usuarios', Rotas_usuarios);
app.use('/pesquisadores', Rotas_pesquisadores);
app.use('/projetos', Rotas_proj);
app.use('/experimentos', Rotas_exp);
app.use('/projetos-experimentos', Rotas_exp_proj);
app.use('/pessoas', Rotas_pessoas);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(3000, () => {
  console.log('Servidor: http://localhost:3000');
});